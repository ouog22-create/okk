"""Client logos displayed on the A homepage."""
import re
import secrets
from urllib.parse import quote
from flask import abort, jsonify

INITIAL_CLIENTS = [('1', 'peripera'), ('2', 'NHR'), ('3', 'the SMC GROUP'), ('4', 'SUNSOFT'), ('5', 'oVice'), ('6', 'Finset N'), ('7', 'heaventree'), ('8', '울산광역정신건강복지센터'), ('9', '대구대학교 산학협력단'), ('10', 'MVM'), ('sk', 'SK'), ('Artygen', 'Artygen Space'), ('사회평론', '사회평론'), ('앳홈', 'ATHOME'), ('망고', 'MANGO board')]
STATIC_LOGOS = {'/okk/assets/' + quote(file) + '.png' for file, _ in INITIAL_CLIENTS}


def initialize_clients(con):
    con.execute('CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, name TEXT NOT NULL, logo TEXT NOT NULL, visible INTEGER NOT NULL DEFAULT 0, trashed INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL, version INTEGER NOT NULL DEFAULT 1)')
    con.execute('CREATE INDEX IF NOT EXISTS clients_media ON clients(logo,visible,trashed)')
    if not con.execute("SELECT 1 FROM meta WHERE key='clients-v1'").fetchone():
        con.executemany('INSERT INTO clients(id,name,logo,visible,position) VALUES(?,?,?,1,?)', [(secrets.token_hex(12), name, '/okk/assets/' + quote(file) + '.png', i) for i, (file, name) in enumerate(INITIAL_CLIENTS)])
        con.execute("INSERT INTO meta VALUES('clients-v1')")


def register_client_routes(app, db, body):
    def record(row):
        return {**dict(row), 'visible': bool(row['visible']), 'trashed': bool(row['trashed'])}

    def validate(values):
        name, logo, visible = values.get('name'), values.get('logo'), values.get('visible', False)
        if not isinstance(name, str) or not name.strip() or len(name) > 150:
            abort(400, '클라이언트명을 150자 이내로 입력해주세요.')
        if not isinstance(visible, bool) or not isinstance(logo, str):
            abort(400, '노출 상태와 로고를 확인해주세요.')
        if logo not in STATIC_LOGOS and not (re.fullmatch(r'/media/[a-f0-9]{32}\.webp', logo) and db().execute('SELECT 1 FROM media WHERE id=?', (logo.rsplit('/', 1)[-1],)).fetchone()):
            abort(400, '클라이언트 로고를 업로드해주세요.')
        return name.strip(), logo, visible

    @app.get('/api/clients')
    def public_clients():
        return jsonify(clients=[dict(r) for r in db().execute('SELECT name,logo FROM clients WHERE visible=1 AND trashed=0 ORDER BY position,id')])

    @app.get('/api/admin/clients')
    def admin_clients():
        return jsonify(clients=[record(r) for r in db().execute('SELECT * FROM clients ORDER BY position,id')])

    @app.post('/api/admin/clients')
    def create_client():
        name, logo, visible = validate(body())
        identity = secrets.token_hex(12)
        con = db()
        con.execute('INSERT INTO clients(id,name,logo,visible,position) VALUES(?,?,?,?,(SELECT COALESCE(MAX(position),0)+1 FROM clients))', (identity, name, logo, visible))
        con.commit()
        return jsonify(client=record(con.execute('SELECT * FROM clients WHERE id=?', (identity,)).fetchone())), 201

    @app.post('/api/admin/clients/order')
    def order_clients():
        ids = body().get('ids')
        con = db()
        con.execute('BEGIN IMMEDIATE')
        current = {r[0] for r in con.execute('SELECT id FROM clients WHERE trashed=0')}
        if not isinstance(ids, list) or any(not isinstance(x, str) for x in ids) or len(ids) != len(current) or set(ids) != current:
            abort(409, '목록이 변경되었습니다. 새로고침해주세요.')
        con.executemany('UPDATE clients SET position=? WHERE id=?', enumerate(ids))
        con.commit()
        return jsonify(ok=True)

    @app.post('/api/admin/clients/<identity>')
    def update_client(identity):
        values = body()
        con = db()
        con.execute('BEGIN IMMEDIATE')
        row = con.execute('SELECT * FROM clients WHERE id=?', (identity,)).fetchone()
        if not row:
            abort(404)
        if values.get('version') != row['version']:
            abort(409, '다른 창에서 변경되었습니다. 입력 내용을 복사한 후 목록을 새로고침해주세요.')
        name, logo, visible, trashed = row['name'], row['logo'], row['visible'], row['trashed']
        action = values.get('action', 'save')
        if action == 'save' and not trashed:
            name, logo, visible = validate(values)
        elif action == 'trash':
            trashed, visible = 1, False
        elif action == 'restore':
            trashed, visible = 0, False
        else:
            abort(400, '허용되지 않은 작업입니다.')
        con.execute('UPDATE clients SET name=?,logo=?,visible=?,trashed=?,version=version+1 WHERE id=?', (name, logo, visible, trashed, identity))
        con.commit()
        return jsonify(client=record(con.execute('SELECT * FROM clients WHERE id=?', (identity,)).fetchone()))
