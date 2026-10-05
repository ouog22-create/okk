"""Keep media private; access is authorized by the existing /media route."""
import os
from urllib.request import Request, urlopen
from urllib.parse import quote
from urllib.error import HTTPError

class SupabaseMedia:
    def __init__(self):
        self.url = os.environ['SUPABASE_URL'].rstrip('/')
        self.key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
        self.bucket = os.getenv('SUPABASE_STORAGE_BUCKET', 'okk-media')
        if not self.url.startswith('https://'):
            raise RuntimeError('SUPABASE_URL must use HTTPS')

    def request(self, name, method='GET', content=None):
        url = self.url + '/storage/v1/object/' + quote(self.bucket, safe='') + '/' + quote(name, safe='')
        headers = {'apikey': self.key, 'Authorization': 'Bearer ' + self.key}
        if content is not None:
            headers['Content-Type'] = 'image/webp'
        req = Request(url, data=content, headers=headers, method=method)
        with urlopen(req, timeout=20) as response:
            return response.read()

    def save(self, name, content):
        self.request(name, 'POST', content)

    def load(self, name):
        try:
            return self.request(name)
        except HTTPError as exc:
            if exc.code in (400, 404):
                raise FileNotFoundError(name) from exc
            raise
