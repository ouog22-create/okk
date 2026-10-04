"""Import a migration.json bundle into the local CMS without replacing existing projects."""
import argparse
from contextlib import closing
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import shutil
import sqlite3
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from cms import create_app
from PIL import Image, ImageOps


def import_bundle(source, apply=False):
    posts = json.loads((source / 'migration.json').read_text())['posts']
    app = create_app()
    data = app.config['DATA_DIR']
    report = {'source': str(source), 'data_directory': str(data), 'imported': [], 'skipped': [], 'media': [], 'review': []}
    prepared = []
    source_assets = {}
    with app.app_context():
        con = app.db()
        for post in posts:
            source_id = str(post['id'])
            if not source_id.isdigit():
                raise ValueError('Expected a numeric source post ID')
            slug = f'portfolio-{source_id}'
            if con.execute('SELECT 1 FROM projects WHERE slug=?', (slug,)).fetchone():
                report['skipped'].append(slug)
                continue
            if len(post['title']) > 150 or len(post['body_text']) > 20000:
                raise ValueError(f'Content exceeds CMS limits: {slug}')
            urls = []
            assets = sorted(post['images'], key=lambda item: item['이미지순서'])
            for asset in assets:
                path = (source / asset['파일경로']).resolve()
                if source not in path.parents:
                    raise ValueError(f'Image path outside migration folder: {path}')
                digest = hashlib.sha256(path.read_bytes()).hexdigest()
                if digest != asset['SHA256']:
                    raise ValueError(f'Image checksum mismatch: {path.name}')
                name = hashlib.sha256(('portfolio-webp-v1:' + digest).encode()).hexdigest()[:32] + '.webp'
                source_assets[name] = (path, asset)
                urls.append('/media/' + name)
            if not urls or len(urls) - 1 > 40:
                raise ValueError(f'Invalid image count: {slug}')
            project = dict(slug=slug, title=post['title'], subtitle='STUDIO OKK / WORK', summary='',
                           client='', year='', scope='', description=post['body_text'], color='lavender',
                           featured=True, thumbnail=urls[0], cover=urls[0],
                           gallery=[dict(src=url, alt=f"{post['title']} 상세 이미지 {index}", caption='')
                                    for index, url in enumerate(urls[1:], 2)])
            identity = hashlib.sha256(('portfolio:' + source_id).encode()).hexdigest()[:24]
            prepared.append((identity, project, not post.get('is_private', True)))
            report['review'].append({'slug': slug, 'source_created_at': post['created_at'],
                                     'notes': post.get('review_notes', []), 'video_urls': post.get('video_urls', [])})
        report['planned_posts'] = len(prepared)
        report['source_images'] = sum(len(post['images']) for post in posts)
        if not apply:
            return report
        stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        backup = Path(__file__).resolve().parents[1] / 'backups' / f'portfolio-import-{stamp}'
        backup.mkdir(parents=True)
        with closing(sqlite3.connect(backup / 'okk.sqlite3')) as copy:
            con.backup(copy)
        shutil.copytree(data / 'uploads', backup / 'uploads')
        report['backup'] = str(backup)
        with tempfile.TemporaryDirectory(prefix='okk-import-') as folder:
            staging = Path(folder)
            # User-provided originals include long strips above the normal upload pixel limit.
            Image.MAX_IMAGE_PIXELS = 60_000_000
            for name, (path, asset) in source_assets.items():
                with Image.open(path) as original:
                    if original.width * original.height > 60_000_000:
                        raise ValueError(f'Image too large: {path.name}')
                    alpha = 'A' in original.getbands() or 'transparency' in original.info
                    image = ImageOps.exif_transpose(original).convert('RGBA' if alpha else 'RGB')
                    image.thumbnail((3200, 16000))
                    if image.width * image.height > 24_000_000:
                        factor = math.sqrt(24_000_000 / (image.width * image.height))
                        image.thumbnail((int(image.width * factor), int(image.height * factor)))
                    image.save(staging / name, 'WEBP', quality=88)
                    report['media'].append({'file': name, 'source': asset['파일경로'], 'size': list(image.size)})
            copied = []
            try:
                con.execute('BEGIN IMMEDIATE')
                position = con.execute('SELECT COALESCE(MAX(position),0) FROM projects').fetchone()[0]
                for name, (path, _) in source_assets.items():
                    destination = data / 'uploads' / name
                    if not destination.exists():
                        shutil.copy2(staging / name, destination)
                        copied.append(destination)
                    con.execute('INSERT OR IGNORE INTO media VALUES(?,?)', (name, path.name[:250]))
                for identity, project, published in prepared:
                    position += 1
                    body = json.dumps(project, ensure_ascii=False)
                    con.execute('INSERT INTO projects(id,slug,draft,published,position) VALUES(?,?,?,?,?)',
                                (identity, project['slug'], body, body if published else None, position))
                    if published:
                        media = {project['cover'], project['thumbnail']} | {item['src'] for item in project['gallery']}
                        con.executemany('INSERT INTO published_media VALUES(?,?)',
                                        [(identity, url.rsplit('/', 1)[-1]) for url in media])
                    report['imported'].append({'id': identity, 'slug': project['slug'], 'title': project['title'], 'published': published})
                con.commit()
            except Exception:
                con.rollback()
                for path in copied:
                    path.unlink(missing_ok=True)
                raise
        report_path = backup / 'import-report.json'
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2))
        report['report_file'] = str(report_path)
        return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    result = import_bundle(args.source.resolve(), args.apply)
    print(json.dumps({key: result.get(key) for key in ['planned_posts', 'source_images', 'backup', 'report_file']}, ensure_ascii=False))
