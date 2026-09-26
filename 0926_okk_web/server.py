"""STUDIO OKK local server. Run: python3 server.py"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from email.message import EmailMessage
import json, os, re, smtplib, ssl, time, threading
from urllib.parse import urlsplit

PUBLIC = Path(__file__).resolve().parent / 'public'
FIELDS = {'company': ('회사명', 100), 'name': ('담당자명', 100), 'phone': ('연락처', 40), 'email': ('이메일', 254), 'message': ('요청사항', 5000)}
lock = threading.Lock()
recent = {}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path in ('/', '/about', '/about/', '/works', '/works/') or re.fullmatch(r'/works/project-0[1-4]/?', path):
            self.path = '/index.html'
        super().do_GET()

    def reply(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != '/api/contact':
            return self.reply(404, {'error': '요청한 경로를 찾을 수 없습니다.'})
        origin = self.headers.get('Origin')
        if origin and urlsplit(origin).netloc != self.headers.get('Host'):
            return self.reply(403, {'error': '허용되지 않은 요청입니다.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 24000:
                return self.reply(413, {'error': '문의 내용이 너무 길거나 비어 있습니다.'})
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError()
            for key, (label, limit) in FIELDS.items():
                value = data.get(key)
                if not isinstance(value, str) or not value.strip() or len(value) > limit:
                    return self.reply(400, {'error': f'{label} 항목을 확인해주세요.'})
                data[key] = value.strip()
            if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', data['email']):
                return self.reply(400, {'error': '올바른 이메일을 입력해주세요.'})
            if any('\r' in data[k] or '\n' in data[k] for k in ('company', 'name', 'email')):
                return self.reply(400, {'error': '입력 형식을 확인해주세요.'})
        except (ValueError, UnicodeError):
            return self.reply(400, {'error': '입력 내용을 확인해주세요.'})
        host, sender = os.getenv('SMTP_HOST'), os.getenv('SMTP_FROM')
        if not host or not sender:
            return self.reply(503, {'error': '현재 문의 발송을 준비 중입니다. ouog22@gmail.com으로 직접 연락해주세요. 입력 내용은 유지됩니다.'})
        ip = self.client_address[0]
        with lock:
            now = time.monotonic()
            for stale in [k for k, v in recent.items() if now-v >= 60]:
                del recent[stale]
            if ip in recent:
                return self.reply(429, {'error': '잠시 후 다시 접수해주세요.'})
            recent[ip] = now
        try:
            message = EmailMessage()
            message['Subject'] = f"[STUDIO OKK 문의] {data['company']} / {data['name']}"
            message['From'] = sender
            message['To'] = 'ouog22@gmail.com'
            message['Reply-To'] = data['email']
            message.set_content('\n\n'.join(f'{label}: {data[key]}' for key, (label, _) in FIELDS.items()))
            port = int(os.getenv('SMTP_PORT', '465'))
            context = ssl.create_default_context()
            if port == 465:
                client = smtplib.SMTP_SSL(host, port, timeout=15, context=context)
            else:
                client = smtplib.SMTP(host, port, timeout=15)
                client.starttls(context=context)
            with client:
                if os.getenv('SMTP_USER'):
                    client.login(os.environ['SMTP_USER'], os.environ.get('SMTP_PASSWORD', ''))
                refused = client.send_message(message)
                if refused:
                    raise smtplib.SMTPException('Recipient refused')
        except Exception:
            return self.reply(502, {'error': '메일을 전송하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해주세요.'})
        self.reply(200, {'ok': True})

if __name__ == '__main__':
    port = int(os.getenv('PORT', '3000'))
    print(f'STUDIO OKK → http://localhost:{port}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
