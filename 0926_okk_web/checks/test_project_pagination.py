import json
import tempfile
import unittest
from cms import create_app


class ProjectPaginationTests(unittest.TestCase):
    def test_pages_keep_public_order_and_stop(self):
        with tempfile.TemporaryDirectory() as folder:
            app = create_app(folder)
            with app.app_context():
                for index in range(7, 26):
                    project = json.dumps({'slug': f'project-{index:02}', 'title': f'Project {index}'})
                    app.db().execute('INSERT INTO projects(id,slug,draft,published,position,trashed) VALUES(?,?,?,?,?,?)',
                                     (str(index), f'project-{index:02}', project, None if index == 24 else project, index, int(index == 25)))
                app.db().commit()
            client = app.test_client()
            collected = []
            for offset, size, next_offset in [(0, 10, 10), (10, 10, 20), (20, 3, None)]:
                response = client.get(f'/api/projects?limit=10&offset={offset}')
                self.assertEqual(response.status_code, 200)
                self.assertEqual(len(response.json['projects']), size)
                self.assertEqual(response.json['next_offset'], next_offset)
                collected.extend(p['slug'] for p in response.json['projects'])
            self.assertEqual(collected, [f'project-{index:02}' for index in range(1, 24)])
            self.assertEqual(len(client.get('/api/projects').json['projects']), 23)
            self.assertEqual(client.get('/api/projects?limit=10&offset=23').json, {'projects': [], 'next_offset': None})
            for query in ['limit=0', 'limit=101', 'limit=bad', 'offset=-1', 'offset=2147483648']:
                self.assertEqual(client.get('/api/projects?' + query).status_code, 400)
