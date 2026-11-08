"""Exercise local save behavior against an isolated temporary blog."""
import hashlib
import base64
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import threading
import unittest
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, build_opener, ProxyHandler
from http.server import ThreadingHTTPServer
from dev.preview import make_handler, ROOT

CONTENT = '---\ntitle: "测试文章"\ndate: 2026-09-27\ntag: 技术\nexcerpt: "摘要"\n---\n\n原文\n'
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=')

class PreviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / 'posts').mkdir()
        (self.root / 'dev').mkdir()
        (self.root / 'posts/test.md').write_text(CONTENT)
        (self.root / 'index.html').write_text('<html><head></head><body>static</body></html>')
        for name in ('generate-posts.js', 'generate-sitemap.js'):
            shutil.copy(ROOT / name, self.root / name)
            subprocess.run(['node', name], cwd=self.root, stdout=subprocess.DEVNULL, check=True)
        for name in ('editor.js', 'editor.css'):
            shutil.copy(ROOT / 'dev' / name, self.root / 'dev' / name)
        handler = make_handler(self.root)
        handler.log_message = lambda *args: None
        self.server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f'http://127.0.0.1:{self.server.server_address[1]}'
        self.http = build_opener(ProxyHandler({}))
        page = self.http.open(self.base).read().decode()
        self.token = re.search(r'name="local-editor-token" content="([^"]+)"', page)[1]
        self.rev = hashlib.sha256(CONTENT.encode()).hexdigest()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def save(self, content=CONTENT, file='posts/test.md', rev=None, headers=None):
        payload = json.dumps({'file': file, 'content': content, 'revision': rev or self.rev}).encode()
        hdr = {'Content-Type': 'application/json', 'Origin': self.base, 'X-Local-Editor-Token': self.token}
        hdr.update(headers or {})
        req = Request(self.base + '/__local/save', data=payload, headers=hdr, method='POST')
        try:
            result = self.http.open(req)
        except HTTPError as error:
            result = error
        return result.status, json.loads(result.read())

    def test_injection_does_not_change_production_html(self):
        self.assertNotIn('__local', (self.root / 'index.html').read_text())
        page = self.http.open(self.base).read().decode()
        self.assertIn('/__local/editor.js', page)
        self.assertEqual(self.http.open(self.base + '/__local/editor.js').status, 200)
        with self.assertRaises(HTTPError) as result:
            self.http.open(self.base + '/dev/editor.js')
        self.assertEqual(result.exception.code, 404)

    def test_save_updates_file_and_metadata(self):
        text = CONTENT.replace('测试文章', '新的标题').replace('原文', '更新后的正文')
        status, result = self.save(text)
        self.assertEqual(status, 200)
        self.assertEqual((self.root / 'posts/test.md').read_text(), text)
        self.assertEqual(result['post']['title'], '新的标题')
        self.assertEqual(result['post']['file'], 'posts/test.md')
        self.assertIn('2026-09-27', (self.root / 'sitemap.xml').read_text())
        self.assertNotEqual(result['revision'], self.rev)

    def test_external_change_is_not_overwritten(self):
        changed = CONTENT + '\n外部修改\n'
        (self.root / 'posts/test.md').write_text(changed)
        status, result = self.save(CONTENT + '\n编辑器草稿\n')
        self.assertEqual(status, 409)
        self.assertEqual((self.root / 'posts/test.md').read_text(), changed)

    def test_cannot_edit_files_outside_existing_posts(self):
        for file in ('index.html', 'posts/../index.html', 'posts/new.md', str(self.root / 'index.html')):
            self.assertEqual(self.save(file=file)[0], 400)
        link = self.root / 'posts/link.md'
        link.symlink_to(self.root / 'index.html')
        self.assertEqual(self.save(file='posts/link.md')[0], 400)
        self.assertEqual((self.root / 'index.html').read_text(), '<html><head></head><body>static</body></html>')

    def test_save_rejects_other_origins_tokens_and_hosts(self):
        for headers in ({'Origin': 'http://example.com'}, {'X-Local-Editor-Token': ''}, {'Host': 'example.com'}):
            self.assertEqual(self.save(headers=headers)[0], 403)
        self.assertEqual((self.root / 'posts/test.md').read_text(), CONTENT)

    def test_index_failure_rolls_back_content_and_index(self):
        before = (self.root / 'posts.json').read_bytes()
        (self.root / 'generate-sitemap.js').write_text('process.exit(1);')
        self.assertEqual(self.save(CONTENT.replace('测试文章', '不应留下的新标题'))[0], 500)
        self.assertEqual((self.root / 'posts/test.md').read_text(), CONTENT)
        self.assertEqual((self.root / 'posts.json').read_bytes(), before)

    def upload(self, name='截图.png', content=CONTENT, image=PNG, headers=None):
        payload = json.dumps({'file': 'posts/test.md', 'content': content, 'name': name,
                              'image': base64.b64encode(image).decode()}).encode()
        hdr = {'Content-Type': 'application/json', 'Origin': self.base, 'X-Local-Editor-Token': self.token}
        hdr.update(headers or {})
        try:
            response = self.http.open(Request(self.base + '/__local/image', data=payload, headers=hdr))
        except HTTPError as error:
            response = error
        return response.status, json.loads(response.read())

    def test_image_uses_date_directory_and_preserves_article(self):
        status, data = self.upload()
        self.assertEqual(status, 200)
        self.assertEqual(data['url'], '/static/2026-09-27/截图.png')
        self.assertEqual(self.http.open(self.base + quote(data['url'])).read(), PNG)
        self.assertEqual((self.root / 'posts/test.md').read_text(), CONTENT)
        self.assertEqual(self.upload()[0], 409)
        self.assertEqual((self.root / 'static/2026-09-27/截图.png').read_bytes(), PNG)

    def test_image_reuses_existing_folder_and_adds_extension(self):
        status, data = self.upload(name='新图片', content=CONTENT + '![](/static/2026-08-01/old.png)')
        self.assertEqual(status, 200)
        self.assertEqual(data['url'], '/static/2026-08-01/新图片.png')

    def test_image_rejects_invalid_names_formats_and_dates(self):
        for name in ('../escape.png', '/tmp/escape.png', 'a\\b.png', '.hidden.png', 'a.jpg', ' bad.png', 'a\n.png'):
            self.assertEqual(self.upload(name=name)[0], 400, name)
        self.assertEqual(self.upload(image=b'<svg></svg>')[0], 400)
        self.assertEqual(self.upload(content=CONTENT.replace('2026-09-27', '2026-02-30'))[0], 400)
        self.assertEqual(self.upload(content='no date')[0], 400)
        self.assertFalse((self.root / 'static').exists())

    def test_image_rejects_other_origins_tokens_and_symlinks(self):
        for headers in ({'Origin': 'http://example.com'}, {'X-Local-Editor-Token': ''}, {'Host': 'example.com'}):
            self.assertEqual(self.upload(headers=headers)[0], 403)
        (self.root / 'static').symlink_to(self.root / 'dev', target_is_directory=True)
        self.assertEqual(self.upload()[0], 400)
        self.assertFalse((self.root / 'dev/2026-09-27').exists())

if __name__ == '__main__':
    unittest.main()
