"""Environment-based first administrator creation."""
import os
import tempfile
import unittest
from unittest.mock import patch
from cms import create_app
from werkzeug.security import check_password_hash


class BootstrapTests(unittest.TestCase):
    def test_login_and_restart_preserves_existing_account(self):
        with tempfile.TemporaryDirectory() as data, patch.dict(os.environ, {
            'OKK_ADMIN_USERNAME': 'test-admin',
            'OKK_ADMIN_PASSWORD': 'test-password-long',
        }):
            app = create_app(data)
            with app.app_context():
                row = app.db().execute('SELECT * FROM admin').fetchone()
                self.assertNotEqual(row['password'], 'test-password-long')
                self.assertTrue(check_password_hash(row['password'], 'test-password-long'))
            client = app.test_client()
            response = client.post('/api/admin/login', json={
                'username': 'test-admin', 'password': 'test-password-long',
            }, headers={'Origin': 'http://localhost'})
            self.assertEqual(response.status_code, 200)
            with patch.dict(os.environ, {'OKK_ADMIN_PASSWORD': 'different-password-long'}):
                restarted = create_app(data)
            with restarted.app_context():
                row = restarted.db().execute('SELECT * FROM admin').fetchone()
                self.assertTrue(check_password_hash(row['password'], 'test-password-long'))

    def test_missing_and_invalid_credentials(self):
        for username, password in [('', ''), ('editor', ''), ('', 'long-test-password'), ('editor', 'short')]:
            with self.subTest(username=username, password_length=len(password)):
                with tempfile.TemporaryDirectory() as data, patch.dict(os.environ, {
                    'OKK_ADMIN_USERNAME': username, 'OKK_ADMIN_PASSWORD': password,
                }):
                    if username or password:
                        with self.assertRaises(RuntimeError):
                            create_app(data)
                    else:
                        app = create_app(data)
                        with app.app_context():
                            self.assertIsNone(app.db().execute('SELECT * FROM admin').fetchone())
