"""Disposable local server for checks/check_review.py; never opens the real database."""
import os
import sys
import tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from cms import create_app
from werkzeug.security import generate_password_hash

if __name__ == '__main__':
    with tempfile.TemporaryDirectory(prefix='okk-review-') as folder:
        app = create_app(folder)
        with app.app_context():
            app.db().execute('INSERT INTO admin VALUES(1,?,?)',
                             (os.getenv('OKK_TEST_USERNAME', 'test-editor'),
                              generate_password_hash(os.getenv('OKK_TEST_PASSWORD', 'temporary-check-password'))))
            app.db().commit()
        app.run(host='127.0.0.1', port=int(os.getenv('OKK_REVIEW_PORT', '3098')))
