import io
import tempfile
import unittest
from PIL import Image
from werkzeug.security import generate_password_hash
from cms import create_app


class ClientTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.app = create_app(self.tmp.name)
        self.client = self.app.test_client()
        self.visitor = self.app.test_client()
        with self.app.app_context():
            self.app.db().execute('INSERT INTO admin VALUES(1,?,?)', ('test', generate_password_hash('test-password')))
            self.app.db().commit()
        self.headers = {'Origin': 'http://localhost'}
        self.headers['X-CSRF-Token'] = self.client.post('/api/admin/login', json={'username': 'test', 'password': 'test-password'}, headers=self.headers).json['csrf']

    def post(self, path, data):
        return self.client.post('/api/admin/clients' + path, json=data, headers=self.headers)

    def test_seed_order_and_persistence(self):
        rows = self.client.get('/api/admin/clients').json['clients']
        self.assertEqual(len(rows), 15)
        ids = [r['id'] for r in rows][::-1]
        self.assertEqual(self.post('/order', {'ids': ids}).status_code, 200)
        self.assertEqual(self.visitor.get('/api/clients').json['clients'][0]['name'], rows[-1]['name'])
        self.assertEqual(self.post('/order', {'ids': ids[:-1]}).status_code, 409)
        self.post('/' + rows[0]['id'], {'version': 1, 'action': 'trash'})
        restarted = create_app(self.tmp.name).test_client()
        self.assertEqual(len(restarted.get('/api/clients').json['clients']), 14)

    def test_upload_visibility_conflict_and_restore(self):
        image = io.BytesIO()
        Image.new('RGBA', (800, 360), (0, 0, 0, 0)).save(image, 'PNG')
        image.seek(0)
        logo = self.client.post('/api/admin/media', data={'file': (image, 'logo.png')}, headers=self.headers).json['url']
        self.assertEqual(self.visitor.get(logo).status_code, 404)
        data = {'name': 'New client', 'logo': logo}
        created = self.post('', data)
        self.assertEqual(created.status_code, 201)
        row = created.json['client']
        self.assertFalse(row['visible'])
        path = '/' + row['id']
        row = self.post(path, {**data, 'visible': True, 'version': 1}).json['client']
        with self.visitor.get(logo) as response:
            self.assertEqual(response.status_code, 200)
        self.assertEqual(self.post(path, {**data, 'version': 1}).status_code, 409)
        row = self.post(path, {'action': 'trash', 'version': row['version']}).json['client']
        self.assertEqual(self.visitor.get(logo).status_code, 404)
        row = self.post(path, {'action': 'restore', 'version': row['version']}).json['client']
        self.assertFalse(row['visible'])
        self.assertFalse(row['trashed'])

    def test_auth_and_validation(self):
        self.assertEqual(self.visitor.get('/api/admin/clients').status_code, 401)
        self.assertEqual(self.client.post('/api/admin/clients', json={}, headers={'Origin': 'http://localhost'}).status_code, 403)
        for logo in ['https://example.com/logo.png', '/okk/assets/not-registered.png', '/media/' + 'a'*32 + '.webp']:
            self.assertEqual(self.post('', {'name': 'Invalid', 'logo': logo}).status_code, 400)
