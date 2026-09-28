"""Persistent project store and authenticated administration API."""
import hashlib
import json
import os
import re
import secrets
import sqlite3
import time
import warnings
from pathlib import Path
from flask import Flask, abort, g, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent
Image.MAX_IMAGE_PIXELS = 24_000_000

def create_app(data_dir=None):
    app = Flask(__name__, static_folder=None)
    data = Path(data_dir or os.getenv('OKK_DATA_DIR', ROOT / 'data')).resolve()
    data.mkdir(parents=True, exist_ok=True)
    (data / 'uploads').mkdir(exist_ok=True)
    app.config.update(MAX_CONTENT_LENGTH=12 * 1024 * 1024, DATA_DIR=data)
    production = os.getenv('OKK_ENV') == 'production'
    origin = os.getenv('OKK_ORIGIN', '').rstrip('/')
    if production and not origin.startswith('https://'):
        raise RuntimeError('운영 환경에는 HTTPS OKK_ORIGIN 설정이 필요합니다.')
    if origin:
        from urllib.parse import urlsplit
        app.config['TRUSTED_HOSTS'] = [urlsplit(origin).hostname]

    def db():
        if 'db' not in g:
            g.db = sqlite3.connect(data / 'okk.sqlite3', timeout=15)
            g.db.row_factory = sqlite3.Row
            g.db.execute('PRAGMA foreign_keys=ON')
        return g.db

    @app.teardown_appcontext
    def close_db(error):
        if 'db' in g:
            g.db.close()

    def sync_public_media(identity, published):
        con = db()
        con.execute('DELETE FROM published_media WHERE project_id=?', (identity,))
        if published:
            project = json.loads(published)
            urls = {project.get('thumbnail'), project.get('cover')} | {item['src'] for item in project.get('gallery', [])}
            con.executemany('INSERT INTO published_media(project_id,media_id) VALUES(?,?)',
                            [(identity, url.rsplit('/', 1)[-1]) for url in urls if url])

    with app.app_context():
        db().executescript('''
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY CHECK(id=1), username TEXT NOT NULL, password TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, draft TEXT NOT NULL, published TEXT, trashed INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS published_media (project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, media_id TEXT NOT NULL REFERENCES media(id), PRIMARY KEY(project_id,media_id));
        CREATE INDEX IF NOT EXISTS published_media_lookup ON published_media(media_id);
        CREATE INDEX IF NOT EXISTS projects_display_order ON projects(trashed,position,id);
        ''')
        db().execute("BEGIN IMMEDIATE")
        if not db().execute("SELECT 1 FROM meta WHERE key='seeded'").fetchone():
            for i, color in enumerate(['lavender', 'lime', 'pink', 'sky', 'lime', 'lavender'], 1):
                p = dict(slug=f'project-{i:02}', title=f'Project {i:02}', subtitle='', summary='작업명과 프로젝트 소개가 들어갈 자리', client='', year='', scope='', description='작업 소개와 프로젝트의 배경, 과정 및 결과를 담을 공간입니다.', color=color, featured=True, thumbnail='', cover='', gallery=[])
                body = json.dumps(p, ensure_ascii=False)
                db().execute('INSERT INTO projects(id,slug,draft,published,position) VALUES(?,?,?,?,?)', (secrets.token_hex(12), p['slug'], body, body, i))
            db().execute("INSERT INTO meta VALUES('seeded')")
        if not db().execute("SELECT 1 FROM meta WHERE key='media-index-v1'").fetchone():
            for row in db().execute('SELECT id,published FROM projects WHERE published IS NOT NULL AND trashed=0').fetchall():
                sync_public_media(row['id'], row['published'])
            db().execute("INSERT INTO meta VALUES('media-index-v1')")
        db().commit()

    def session():
        raw = request.cookies.get('okk_session', '')
        return db().execute('SELECT * FROM sessions WHERE token=? AND expires>?', (hashlib.sha256(raw.encode()).hexdigest(), time.time())).fetchone() if raw else None

    @app.before_request
    def protect():
        if request.method not in ('GET', 'HEAD', 'OPTIONS'):
            expected = origin or request.host_url.rstrip('/')
            if request.headers.get('Origin') != expected:
                abort(403, '허용되지 않은 요청입니다.')
        if request.path.startswith('/api/admin/') and request.path != '/api/admin/login':
            g.auth = session()
            if not g.auth:
                abort(401, '로그인이 필요합니다. 입력 내용은 유지됩니다.')
            if request.method != 'GET' and not secrets.compare_digest(request.headers.get('X-CSRF-Token', ''), g.auth['csrf']):
                abort(403, '인증 정보가 만료되었습니다. 다시 로그인해주세요.')

    @app.after_request
    def headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'same-origin'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        if request.path.startswith(('/api/', '/media/', '/admin')):
            response.headers['Cache-Control'] = 'no-store'
        if production:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000'
        return response

    @app.errorhandler(HTTPException)
    def error(exc):
        return jsonify(error=exc.description), exc.code

    def body():
        value = request.get_json()
        if not isinstance(value, dict):
            abort(400, '입력 형식을 확인해주세요.')
        return value

    def limit(key, maximum, seconds):
        now = time.time()
        con = db()
        con.execute('DELETE FROM attempts WHERE until<?', (now,))
        con.execute('INSERT INTO attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1', (key, now + seconds))
        count = con.execute('SELECT count FROM attempts WHERE key=?', (key,)).fetchone()[0]
        con.commit()
        if count > maximum:
            abort(429, '요청이 많습니다. 잠시 후 다시 시도해주세요.')

    @app.post('/api/admin/login')
    def login():
        limit('login', 30, 300)
        values = body()
        admin = db().execute('SELECT * FROM admin WHERE id=1').fetchone()
        if not admin:
            abort(503, '관리자 계정 설정이 필요합니다. 서버에서 manage.py admin 명령을 실행해주세요.')
        username, password = values.get('username', ''), values.get('password', '')
        if not isinstance(username, str) or not isinstance(password, str) or len(password) > 1024:
            abort(400)
        valid = check_password_hash(admin['password'], password)
        if not valid or not secrets.compare_digest(admin['username'].encode(), username.encode()):
            abort(401, '아이디 또는 비밀번호를 확인해주세요.')
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        db().execute('DELETE FROM sessions WHERE expires<?', (time.time(),))
        db().execute('INSERT INTO sessions VALUES(?,?,?)', (hashlib.sha256(token.encode()).hexdigest(), csrf, time.time() + 8*3600))
        db().commit()
        response = jsonify(csrf=csrf, username=admin['username'])
        response.set_cookie('okk_session', token, max_age=8*3600, httponly=True, secure=production, samesite='Strict', path='/')
        return response

    @app.get('/api/admin/session')
    def current_session():
        return jsonify(csrf=g.auth['csrf'])

    @app.post('/api/admin/logout')
    def logout():
        db().execute('DELETE FROM sessions WHERE token=?', (g.auth['token'],))
        db().commit()
        response = jsonify(ok=True)
        response.delete_cookie('okk_session', path='/')
        return response

    def record(row):
        return dict(id=row['id'], draft=json.loads(row['draft']), published=bool(row['published']), dirty=bool(row['published'] and row['draft'] != row['published']), trashed=bool(row['trashed']), version=row['version'], updated=row['updated'])

    @app.get('/api/projects')
    def public_projects():
        return jsonify(projects=[json.loads(r['published']) for r in db().execute('SELECT published FROM projects WHERE published IS NOT NULL AND trashed=0 ORDER BY position,id')])

    @app.get('/api/admin/projects')
    def admin_projects():
        return jsonify(projects=[record(r) for r in db().execute('SELECT * FROM projects ORDER BY position,id')])

    def validate(values):
        if not isinstance(values, dict):
            abort(400, "프로젝트 입력 형식을 확인해주세요.")
        out = {}
        for key, maximum in dict(slug=80, title=150, subtitle=200, summary=500, client=150, year=20, scope=300, description=20000, color=20, thumbnail=100, cover=100).items():
            v = values.get(key, '')
            if not isinstance(v, str) or len(v) > maximum:
                abort(400, f'{key} 항목을 확인해주세요.')
            out[key] = v.strip()
        if not out['title'] or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', out['slug']):
            abort(400, '제목과 URL 식별자(영문 소문자·숫자·하이픈)를 확인해주세요.')
        if out['color'] not in ['lavender', 'lime', 'pink', 'sky']:
            abort(400, '배경색을 확인해주세요.')
        if not isinstance(values.get('featured', False), bool):
            abort(400)
        out['featured'] = values.get('featured', False)
        gallery = values.get('gallery', [])
        if not isinstance(gallery, list) or len(gallery) > 40:
            abort(400, '상세 이미지는 최대 40장입니다.')
        out['gallery'] = []
        for item in gallery:
            if not isinstance(item, dict) or any(not isinstance(item.get(k, ''), str) or len(item.get(k, '')) > 500 for k in ['src', 'alt', 'caption']):
                abort(400, '이미지 정보를 확인해주세요.')
            out['gallery'].append({k:item.get(k, '') for k in ['src', 'alt', 'caption']})
        for url in [out['thumbnail'], out['cover']] + [i['src'] for i in out['gallery']]:
            if url and (not re.fullmatch(r'/media/[a-f0-9]{32}\.webp', url) or not db().execute('SELECT 1 FROM media WHERE id=?', (url.split('/')[-1],)).fetchone()):
                abort(400, '등록된 이미지를 선택해주세요.')
        return out

    @app.post('/api/admin/projects')
    def create_project():
        p = validate(body())
        identity = secrets.token_hex(12)
        try:
            db().execute('INSERT INTO projects(id,slug,draft,position) VALUES(?,?,?,(SELECT COALESCE(MAX(position),0)+1 FROM projects))', (identity, p['slug'], json.dumps(p, ensure_ascii=False)))
            db().commit()
        except sqlite3.IntegrityError:
            abort(409, '이미 사용 중인 URL 식별자입니다.')
        return jsonify(project=record(db().execute('SELECT * FROM projects WHERE id=?', (identity,)).fetchone())), 201

    @app.post('/api/admin/projects/<identity>')
    def update_project(identity):
        values = body()
        con = db()
        con.execute('BEGIN IMMEDIATE')
        row = con.execute('SELECT * FROM projects WHERE id=?', (identity,)).fetchone()
        if not row:
            abort(404)
        if values.get('version') != row['version']:
            abort(409, '다른 창에서 변경되었습니다. 입력 내용을 복사한 후 목록을 새로고침해주세요.')
        action = values.get('action', 'save')
        draft, published, trashed = row['draft'], row['published'], row['trashed']
        if action == 'save':
            p = validate(values.get('project', {}))
            # 기존 링크를 유지하기 위해 식별자는 고정한다.
            if p['slug'] != row['slug']:
                abort(400, '생성 후 URL 식별자는 변경할 수 없습니다.')
            draft = json.dumps(p, ensure_ascii=False)
        elif action == 'publish' and not trashed:
            published = draft
        elif action == 'unpublish':
            published = None
        elif action == 'trash':
            trashed, published = 1, None
        elif action == 'restore':
            trashed = 0
        else:
            abort(400, '허용되지 않은 작업입니다.')
        con.execute('UPDATE projects SET draft=?,published=?,trashed=?,version=version+1,updated=CURRENT_TIMESTAMP WHERE id=?', (draft, published, trashed, identity))
        if action != 'save':
            sync_public_media(identity, published if not trashed else None)
        con.commit()
        return jsonify(project=record(con.execute('SELECT * FROM projects WHERE id=?', (identity,)).fetchone()))

    @app.post('/api/admin/order')
    def order():
        ids = body().get('ids')
        con = db()
        con.execute('BEGIN IMMEDIATE')
        current = {r[0] for r in con.execute('SELECT id FROM projects WHERE trashed=0')}
        if not isinstance(ids, list) or any(not isinstance(x, str) for x in ids) or len(ids) != len(current) or set(ids) != current:
            abort(409, '목록이 변경되었습니다. 새로고침해주세요.')
        con.executemany('UPDATE projects SET position=? WHERE id=?', enumerate(ids))
        con.commit()
        return jsonify(ok=True)

    @app.post('/api/admin/media')
    def upload():
        upload = request.files.get('file')
        if not upload:
            abort(400, '이미지를 선택해주세요.')
        try:
            with warnings.catch_warnings():
                warnings.simplefilter('error', Image.DecompressionBombWarning)
                image = Image.open(upload.stream)
                if image.format not in ('JPEG', 'PNG', 'WEBP'):
                    raise ValueError()
                image.load()
                has_alpha = 'A' in image.getbands() or 'transparency' in image.info
                image = ImageOps.exif_transpose(image).convert('RGBA' if has_alpha else 'RGB')
                image.thumbnail((3200, 3200))
                name = secrets.token_hex(16) + '.webp'
                image.save(data / 'uploads' / name, 'WEBP', quality=88)
        except (ValueError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning):
            abort(400, 'JPG·PNG·WebP 이미지(최대 12MB, 2,400만 화소)를 선택해주세요.')
        db().execute('INSERT INTO media VALUES(?,?)', (name, (upload.filename or '')[:250]))
        db().commit()
        return jsonify(url='/media/' + name), 201

    @app.get('/media/<name>')
    def media(name):
        if not re.fullmatch(r'[a-f0-9]{32}\.webp', name):
            abort(404)
        if not session() and not db().execute('SELECT 1 FROM published_media WHERE media_id=? LIMIT 1', (name,)).fetchone():
            abort(404)
        return send_from_directory(data / 'uploads', name)

    @app.post('/api/contact')
    def contact():
        from contact_service import send_contact
        limit('contact:' + (request.remote_addr or ''), 5, 60)
        result, code = send_contact(body())
        return jsonify(result), code

    @app.get('/admin')
    @app.get('/admin/')
    def admin_page():
        return send_from_directory(ROOT / 'public/admin', 'index.html')

    @app.get('/')
    @app.get('/okk/')
    @app.get('/about')
    @app.get('/works')
    @app.get('/works/<slug>')
    @app.get('/okk/about')
    @app.get('/okk/works')
    @app.get('/okk/works/<slug>')
    def site(slug=None):
        return send_from_directory(ROOT / 'public', 'index.html')

    @app.get('/<path:filename>')
    def static_file(filename):
        if filename.startswith('okk/'):
            filename = filename[4:]
        if filename.endswith('/'):
            filename += 'index.html'
        return send_from_directory(ROOT / 'public', filename)

    app.db = db
    return app
