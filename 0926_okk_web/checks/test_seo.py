import json
import os
import tempfile
import unittest
from unittest.mock import patch
from urllib.robotparser import RobotFileParser
from xml.etree import ElementTree

from cms import create_app


class SearchDiscoveryTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.env = patch.dict(os.environ, {
            'OKK_ORIGIN': 'https://studio-okk.com',
            'OKK_ALLOWED_ORIGINS': 'https://okkeverything.vercel.app',
        })
        self.env.start()
        self.addCleanup(self.env.stop)
        self.app = create_app(self.folder.name)
        self.client = self.app.test_client()

    def get(self, path, host='https://studio-okk.com'):
        return self.client.get(path, base_url=host)

    def locations(self, response):
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, 'application/xml')
        return [node.text for node in ElementTree.fromstring(response.data).findall(
            '{http://www.sitemaps.org/schemas/sitemap/0.9}url/'
            '{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]

    def test_sitemap_uses_published_slugs_and_reflects_unpublishing(self):
        with self.app.app_context():
            for identity, published, trashed in [
                ('seo-live', {'slug': 'published-name'}, 0),
                ('seo-draft', None, 0),
                ('seo-trash', {'slug': 'trashed-name'}, 1),
            ]:
                draft = json.dumps({'slug': identity})
                self.app.db().execute(
                    'INSERT INTO projects(id,slug,draft,published,position,trashed) VALUES(?,?,?,?,?,?)',
                    (identity, identity, draft, json.dumps(published) if published else None, 100, trashed),
                )
            self.app.db().commit()
        urls = self.locations(self.get('/sitemap.xml'))
        self.assertEqual(urls[:3], ['https://studio-okk.com' + p for p in ('/', '/about', '/works')])
        self.assertIn('https://studio-okk.com/works/published-name', urls)
        self.assertFalse(any('seo-' in url or 'trashed-name' in url for url in urls))
        self.assertEqual(len(urls), len(set(urls)))
        with self.app.app_context():
            self.app.db().execute('UPDATE projects SET published=NULL WHERE id=?', ('seo-live',))
            self.app.db().commit()
        response = self.get('/sitemap.xml')
        self.assertNotIn('https://studio-okk.com/works/published-name', self.locations(response))
        self.assertEqual(response.headers['Cache-Control'], 'no-store')

    def test_alias_does_not_change_sitemap_domain(self):
        urls = self.locations(self.get('/sitemap.xml', 'https://okkeverything.vercel.app'))
        self.assertTrue(all(url.startswith('https://studio-okk.com/') for url in urls))

    def test_robots_allows_rendering_resources_and_blocks_admin(self):
        response = self.get('/robots.txt')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, 'text/plain')
        rules = RobotFileParser()
        rules.parse(response.text.splitlines())
        self.assertEqual(rules.site_maps(), ['https://studio-okk.com/sitemap.xml'])
        for agent in ('Googlebot', 'Yeti', 'OtherBot'):
            for path in ('/', '/works', '/about', '/works/published-name', '/api/projects',
                         '/api/clients', '/media/example.webp', '/site/data.js', '/assets/logo.svg'):
                self.assertTrue(rules.can_fetch(agent, 'https://studio-okk.com' + path), path)
            for path in ('/admin', '/admin/', '/admin/api.js', '/api/admin/projects', '/okk/admin/'):
                self.assertFalse(rules.can_fetch(agent, 'https://studio-okk.com' + path), path)
