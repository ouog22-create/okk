"""Run: .venv/bin/python -m unittest discover -s checks -p 'test_*.py'"""
import io
from contextlib import closing
from unittest.mock import patch
import os
import sqlite3
import subprocess
import sys
from pathlib import Path
import tempfile
import unittest
from PIL import Image
from werkzeug.security import generate_password_hash
from cms import create_app

class AdminTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.app = create_app(self.tmp.name)
        self.app.config['TESTING'] = True
        with self.app.app_context():
            con = self.app.db()
            con.execute('INSERT INTO admin VALUES(1,?,?)', ('editor', generate_password_hash('a-long-test-password')))
            con.commit()
        self.client = self.app.test_client()
        self.visitor = self.app.test_client()
        self.headers = {'Origin': 'http://localhost'}
        login = self.client.post('/api/admin/login', json={'username':'editor','password':'a-long-test-password'}, headers=self.headers)
        self.assertEqual(login.status_code, 200)
        self.headers['X-CSRF-Token'] = login.json['csrf']

    def tearDown(self):
        self.tmp.cleanup()

    def post(self, path, value):
        return self.client.post('/api/admin/' + path, json=value, headers=self.headers)

    def new_project(self):
        result = self.post('projects', dict(slug='test-work', title='새 작업 <script>', color='sky', description='설명', featured=True, gallery=[]))
        self.assertEqual(result.status_code, 201, result.json)
        return result.json['project']

    def action(self, p, action, **kwargs):
        result = self.post('projects/' + p['id'], dict(version=p['version'], action=action, **kwargs))
        self.assertEqual(result.status_code, 200, result.json)
        return result.json['project']

    def public(self):
        return self.visitor.get('/api/projects').json['projects']

    def test_draft_publish_edit_unpublish_restore_persistence(self):
        p = self.new_project()
        self.assertEqual(len(self.public()), 6)
        p = self.action(p, 'publish')
        self.assertEqual(self.public()[-1]['title'], '새 작업 <script>')
        p['draft']['title'] = '수정 초안'
        p = self.action(p, 'save', project=p['draft'])
        self.assertTrue(p['dirty'])
        self.assertEqual(self.public()[-1]['title'], '새 작업 <script>')
        p = self.action(p, 'publish')
        self.assertEqual(self.public()[-1]['title'], '수정 초안')
        restarted = create_app(self.tmp.name).test_client()
        self.assertEqual(restarted.get('/api/projects').json['projects'][-1]['title'], '수정 초안')
        p = self.action(p, 'trash')
        self.assertEqual(len(self.public()), 6)
        p = self.action(p, 'restore')
        self.assertFalse(p['published'])
        p = self.action(p, 'publish')
        self.action(p, 'unpublish')
        self.assertEqual(len(self.public()), 6)

    def test_auth_csrf_logout_and_conflicts(self):
        self.assertEqual(self.visitor.get('/api/admin/projects').status_code, 401)
        self.assertEqual(self.client.post('/api/admin/projects', json={}, headers={'Origin':'https://evil.example'}).status_code, 403)
        self.assertEqual(self.client.post('/api/admin/projects', json={}, headers={'Origin':'http://localhost'}).status_code, 403)
        p = self.new_project()
        self.assertEqual(self.post('projects', p['draft']).status_code, 409)
        updated = self.action(p, 'publish')
        self.assertEqual(self.post('projects/'+p['id'],dict(action='trash', version=p['version'])).status_code, 409)
        updated['draft']['slug']='changed'
        self.assertEqual(self.post('projects/'+p['id'],dict(action='save',version=updated['version'],project=updated['draft'])).status_code,400)
        self.post('logout', {})
        self.assertEqual(self.client.get('/api/admin/projects').status_code, 401)

    def test_image_visibility_and_validation(self):
        image = io.BytesIO()
        Image.new('RGB',(40,30),'blue').save(image,'PNG')
        image.seek(0)
        result = self.client.post('/api/admin/media', data={'file':(image,'sample.png')}, headers=self.headers)
        self.assertEqual(result.status_code, 201)
        url = result.json['url']
        with self.client.get(url) as response:
            self.assertEqual(response.status_code,200)
        self.assertEqual(self.visitor.get(url).status_code,404)
        p = self.new_project()
        p['draft']['cover']=url
        p = self.action(p,'save',project=p['draft'])
        p = self.action(p,'publish')
        response=self.visitor.get(url)
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.headers['Cache-Control'],'no-store')
        response.close()
        self.action(p,'unpublish')
        self.assertEqual(self.visitor.get(url).status_code,404)
        invalid=self.client.post('/api/admin/media',data={'file':(io.BytesIO(b'<svg></svg>'),'fake.png')},headers=self.headers)
        self.assertEqual(invalid.status_code,400)
        p['draft']['cover']='https://example.com/image.jpg'
        self.assertEqual(self.post('projects',p['draft']).status_code,400)

    def test_order_paths_and_contact(self):
        all_projects=self.client.get('/api/admin/projects').json['projects']
        ids=[p['id'] for p in all_projects][::-1]
        self.assertEqual(self.post('order',{'ids':ids}).status_code,200)
        self.assertEqual(self.public()[0]['slug'],'project-06')
        self.assertEqual(self.post('order',{'ids':ids[:-1]}).status_code,409)
        for path in ['/','/okk/','/okk/works','/okk/works/project-01','/works/project-01','/admin/','/okk/app.js']:
            with self.client.get(path) as response:
                self.assertEqual(response.status_code,200,path)
        for path in ['/b/','/b-1/','/okk/b/','/okk/b-1/','/b/app.js','/b-1/style.css','/data/okk.sqlite3','/cms.py','/media/../../cms.py']:
            self.assertEqual(self.client.get(path).status_code,404,path)
        response=self.client.post('/api/contact',json={},headers=self.headers)
        self.assertEqual(response.status_code,400)


    def test_expired_session_invalid_payload_and_rate_limit(self):
        p = self.new_project()
        result = self.post('projects/'+p['id'], dict(action='save',version=p['version'],project=[]))
        self.assertEqual(result.status_code, 400)
        with self.app.app_context():
            self.app.db().execute('UPDATE sessions SET expires=0')
            self.app.db().commit()
        self.assertEqual(self.client.get('/api/admin/session').status_code, 401)
        with self.app.app_context():
            self.app.db().execute("UPDATE attempts SET count=30 WHERE key='login'")
            self.app.db().commit()
        self.assertEqual(self.client.post('/api/admin/login', json={'username':'editor','password':'wrong'}, headers=self.headers).status_code,429)

    def test_production_cookie_and_host(self):
        with patch.dict(os.environ, {'OKK_ENV':'production','OKK_ORIGIN':'https://studio.example.com'}):
            prod = create_app(self.tmp.name).test_client()
            response = prod.post('/api/admin/login', base_url='https://studio.example.com', headers={'Origin':'https://studio.example.com'}, json={'username':'editor','password':'a-long-test-password'})
            self.assertEqual(response.status_code,200)
            cookie = response.headers['Set-Cookie']
            for flag in ['Secure','HttpOnly','SameSite=Strict']:
                self.assertIn(flag,cookie)
            self.assertEqual(prod.get('/api/projects',base_url='https://evil.example').status_code,400)
            self.assertEqual(prod.get('/api/admin/projects',base_url='https://studio.example.com').status_code,200)

    def test_palette_upload_preserves_transparency(self):
        image = Image.new('P', (20,20), 0)
        image.putpalette([255,0,0] + [0,0,0]*255)
        source = io.BytesIO()
        image.save(source, 'PNG', transparency=0)
        source.seek(0)
        result = self.client.post('/api/admin/media', data={'file':(source,'palette.png')}, headers=self.headers)
        self.assertEqual(result.status_code,201)
        with self.client.get(result.json['url']) as response:
            with Image.open(io.BytesIO(response.data)) as uploaded:
                self.assertEqual(uploaded.convert('RGBA').getpixel((0,0))[3],0)

    def test_media_index_migration_and_shared_visibility(self):
        image = io.BytesIO()
        Image.new('RGB', (20,20), 'red').save(image, 'PNG')
        image.seek(0)
        url = self.client.post('/api/admin/media', data={'file':(image,'test.png')}, headers=self.headers).json['url']
        first = self.new_project()
        first['draft']['cover'] = url
        first = self.action(first, 'save', project=first['draft'])
        first = self.action(first, 'publish')
        second_data = {**first['draft'], 'slug':'shared-image'}
        second = self.post('projects', second_data).json['project']
        second = self.action(second, 'publish')
        with self.app.app_context():
            con = self.app.db()
            con.execute('DELETE FROM published_media')
            con.execute("DELETE FROM meta WHERE key='media-index-v1'")
            con.commit()
        migrated = create_app(self.tmp.name).test_client()
        with migrated.get(url) as response:
            self.assertEqual(response.status_code,200)
        self.action(first, 'unpublish')
        with self.visitor.get(url) as response:
            self.assertEqual(response.status_code,200)
        second['draft']['cover'] = ''
        second = self.action(second, 'save', project=second['draft'])
        with self.visitor.get(url) as response:
            self.assertEqual(response.status_code,200)
        self.action(second, 'publish')
        self.assertEqual(self.visitor.get(url).status_code,404)

    def test_save_with_publication_state_is_atomic(self):
        p = self.new_project()
        self.assertFalse(p['published'])
        self.assertEqual(p['draft']['subtitle'], 'STUDIO OKK / WORK')
        p['draft']['title'] = '공개 토글 ON'
        p = self.action(p, 'save', project=p['draft'], publish=True)
        self.assertTrue(p['published'])
        self.assertEqual(self.public()[-1]['title'], '공개 토글 ON')
        p['draft']['title'] = '공개 상태에서 저장'
        p = self.action(p, 'save', project=p['draft'], publish=True)
        self.assertEqual(self.public()[-1]['title'], '공개 상태에서 저장')
        p['draft']['title'] = ''
        failed = self.post('projects/'+p['id'], dict(action='save',version=p['version'],project=p['draft'],publish=True))
        self.assertEqual(failed.status_code,400)
        self.assertEqual(self.public()[-1]['title'], '공개 상태에서 저장')
        self.action(p, 'unpublish')
        self.assertEqual(len(self.public()),6)

    def test_new_project_can_be_saved_and_published_once(self):
        project = dict(slug='toggle-on',title='즉시 공개',subtitle='사용하지 않는 부제',color='lavender',publish=True)
        response = self.post('projects',project)
        self.assertEqual(response.status_code,201)
        p = response.json['project']
        self.assertTrue(p['published'])
        self.assertEqual(self.public()[-1]['subtitle'],'STUDIO OKK / WORK')
        invalid = self.post('projects',{**project,'slug':'bad-toggle','publish':'true'})
        self.assertEqual(invalid.status_code,400)

    def test_backup_can_restore_without_sessions(self):
        p = self.action(self.new_project(), 'publish')
        with tempfile.TemporaryDirectory() as destination:
            result = subprocess.run([sys.executable, 'manage.py', 'backup', '--destination', destination], env={**os.environ,'OKK_DATA_DIR':self.tmp.name}, capture_output=True, text=True)
            self.assertEqual(result.returncode,0,result.stderr)
            backup = next(Path(destination).iterdir())
            with closing(sqlite3.connect(backup/'okk.sqlite3')) as con:
                self.assertEqual(con.execute('SELECT COUNT(*) FROM sessions').fetchone()[0],0)
            restored = create_app(backup).test_client()
            self.assertEqual(restored.get('/api/projects').json['projects'][-1]['slug'],p['draft']['slug'])

if __name__ == '__main__':
    unittest.main()
