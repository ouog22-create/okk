"""Local: .venv/bin/python server.py. Production: gunicorn 'cms:create_app()'."""
import os
from cms import create_app

if __name__ == '__main__':
    create_app().run(host='127.0.0.1', port=int(os.getenv('PORT', '3000')), debug=False)
