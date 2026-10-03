#!/usr/bin/env python3
"""Local-only blog preview with an injected Markdown editor. No dependencies."""
import argparse
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import subprocess
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
MAX_BODY = 4 * 1024 * 1024

def revision(content):
    return hashlib.sha256(content.encode('utf-8')).hexdigest()

def atomic_write(path, content):
    mode = path.stat().st_mode & 0o777
    fd, name = tempfile.mkstemp(prefix='.local-edit-', dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as output:
            output.write(content)
        os.chmod(name, mode)
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def make_handler(root=ROOT):
    root = root.resolve()
    token = secrets.token_urlsafe(32)
    lock = threading.Lock()

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(root), **kwargs)

        def end_headers(self):
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            super().end_headers()

        def valid_host(self):
            port = self.server.server_address[1]
            return self.headers.get('Host') in (f'localhost:{port}', f'127.0.0.1:{port}')

        def reply(self, status, data, mime='application/json; charset=utf-8'):
            body = json.dumps(data, ensure_ascii=False).encode() if isinstance(data, dict) else data
            self.send_response(status)
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def post_path(self, name):
            if not isinstance(name, str):
                raise ValueError('请选择一篇现有文章。')
            path = (root / name).resolve()
            if path.parent != (root / 'posts').resolve() or path.suffix != '.md' or not path.is_file():
                raise ValueError('只能编辑 posts 目录内现有的 Markdown 文章。')
            return path

        def do_GET(self):
            if not self.valid_host():
                self.reply(403, {'error': 'Invalid local host'})
                return
            route = urlsplit(self.path)
            if route.path == '/__local/post':
                try:
                    name = parse_qs(route.query).get('file', [''])[0]
                    content = self.post_path(name).read_text()
                    self.reply(200, {'content': content, 'revision': revision(content)})
                except (ValueError, OSError) as error:
                    self.reply(400, {'error': str(error)})
                return
            if route.path in ('/__local/editor.js', '/__local/editor.css'):
                filename = route.path.rsplit('/', 1)[1]
                mime = 'text/javascript' if filename.endswith('.js') else 'text/css'
                self.reply(200, (root / 'dev' / filename).read_bytes(), mime + '; charset=utf-8')
                return
            if route.path in ('/', '/index.html'):
                page = (root / 'index.html').read_text()
                injection = f'<meta name="local-editor-token" content="{token}"><link rel="stylesheet" href="/__local/editor.css"><script src="/__local/editor.js" defer></script>'
                self.reply(200, page.replace('</head>', injection + '</head>').encode(), 'text/html; charset=utf-8')
                return
            # Serve only public site files; never tooling, dotfiles or directory listings.
            name = unquote(route.path).lstrip('/')
            target = (root / name).resolve()
            public = {'posts.json', 'sitemap.xml', 'robots.txt', 'favicon.ico', 'CNAME'}
            allowed = name in public or name.startswith(('assets/', 'static/', 'posts/'))
            if not allowed or not target.is_relative_to(root) or not target.is_file() or any(p.startswith('.') for p in Path(name).parts):
                self.send_error(404)
                return
            super().do_GET()

        def do_HEAD(self):
            self.send_error(405)

        def do_POST(self):
            if urlsplit(self.path).path != '/__local/save':
                self.reply(404, {'error': 'Not found'})
                return
            origin = self.headers.get('Origin')
            expected = 'http://' + self.headers.get('Host', '')
            csrf = self.headers.get('X-Local-Editor-Token', '')
            if not self.valid_host() or origin != expected or not hmac.compare_digest(csrf, token):
                self.reply(403, {'error': '请从当前本地预览页面保存。'})
                return
            try:
                size = int(self.headers.get('Content-Length', '0'))
                if not 0 < size <= MAX_BODY:
                    self.reply(413, {'error': '文章过大或内容为空。'})
                    return
                if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                    self.reply(415, {'error': 'Invalid content type'})
                    return
                data = json.loads(self.rfile.read(size))
                if not isinstance(data, dict):
                    raise ValueError('保存内容格式错误。')
                path = self.post_path(data.get('file'))
                content = data.get('content')
                if not isinstance(content, str) or not content.strip() or '\0' in content:
                    raise ValueError('文章内容不能为空或包含无效字符。')
                if content.startswith('---\n') and '\n---' not in content[4:]:
                    raise ValueError('开头的文章信息缺少结束的 ---。')
                with lock:
                    old = path.read_text()
                    if data.get('revision') != revision(old):
                        self.reply(409, {'error': '文件已被其他程序修改。请先复制当前草稿，再重新打开文章，避免覆盖修改。'})
                        return
                    backups = {p: p.read_bytes() if p.exists() else None for p in (root / 'posts.json', root / 'sitemap.xml')}
                    try:
                        atomic_write(path, content.encode())
                        for script in ('generate-posts.js', 'generate-sitemap.js'):
                            subprocess.run(['node', script], cwd=root, capture_output=True, text=True, timeout=30, check=True)
                        index = json.loads((root / 'posts.json').read_text())
                        post = next(p for p in index['posts'] if (root / p['file']).resolve() == path)
                    except Exception:
                        atomic_write(path, old.encode())
                        for p, value in backups.items():
                            if value is None:
                                p.unlink(missing_ok=True)
                            else:
                                atomic_write(p, value)
                        self.reply(500, {'error': '生成文章索引失败，文件已恢复。请检查本地 Node.js 环境。'})
                        return
                    self.reply(200, {'revision': revision(content), 'post': post})
            except (ValueError, OSError, TypeError, UnicodeError) as error:
                self.reply(400, {'error': str(error)})

    return Handler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    # Refresh externally edited posts before launching the local preview.
    for script in ('generate-posts.js', 'generate-sitemap.js'):
        subprocess.run(['node', script], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
    server = ThreadingHTTPServer(('127.0.0.1', args.port), make_handler())
    print(f'Local editor: http://localhost:{args.port}/', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
