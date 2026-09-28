"""Create/reset an administrator or back up the entire persistent data directory."""
import argparse
from contextlib import closing
import getpass
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from werkzeug.security import generate_password_hash
from cms import create_app

parser = argparse.ArgumentParser()
parser.add_argument('command', choices=['admin', 'backup'])
parser.add_argument('--destination', help='Backup parent directory (outside the data directory)')
args = parser.parse_args()
app = create_app()
with app.app_context():
    con = app.db()
    if args.command == 'admin':
        username = input('관리자 아이디: ').strip()
        password = getpass.getpass('비밀번호 (12자 이상): ')
        confirm = getpass.getpass('비밀번호 확인: ')
        if not username or len(username) > 100 or len(password) < 12 or len(password) > 1024 or password != confirm:
            raise SystemExit('아이디 또는 비밀번호를 확인해주세요.')
        con.execute('INSERT INTO admin VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET username=excluded.username,password=excluded.password', (username, generate_password_hash(password)))
        con.execute('DELETE FROM sessions')
        con.commit()
        print('관리자 계정을 저장했습니다. 기존 로그인 세션은 만료됩니다.')
    else:
        source = app.config['DATA_DIR']
        parent = Path(args.destination or 'backups').resolve()
        if parent == source or source in parent.parents:
            raise SystemExit('백업 경로는 데이터 폴더 외부여야 합니다.')
        destination = parent / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        destination.mkdir(parents=True)
        with closing(sqlite3.connect(destination / 'okk.sqlite3')) as backup:
            con.backup(backup)
            backup.execute('DELETE FROM sessions')
            backup.commit()
        # 이미지가 불변이므로 DB 스냅샷 후 복사해도 참조가 유지된다.
        shutil.copytree(source / 'uploads', destination / 'uploads')
        print(f'백업 완료: {destination}')
