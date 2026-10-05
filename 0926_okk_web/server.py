"""WSGI entrypoint for Vercel and local development."""
import os
from cms import create_app

app = create_app()

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=int(os.getenv('PORT', '3000')), debug=False)
