/* Injected by dev/preview.py only. The production page never loads this file. */
(() => {
    'use strict';
    const token = document.querySelector('meta[name="local-editor-token"]')?.content;
    if (!token) return;
    let state = null;
    let renderTimer;
    let renderVersion = 0;
    const previewStyles = fetch('/assets/css/style.css', { cache: 'no-store' })
        .then(response => {
            if (!response.ok) throw new Error('预览样式加载失败。');
            return response.text();
        })
        .then(css => css.replace(/@import\s+url\([^;]+;/g, ''));
    // Keep the preview independent of external font services.
    previewStyles.catch(() => {});
    const dialog = document.createElement('dialog');
    dialog.id = 'local-editor';
    dialog.setAttribute('aria-labelledby', 'local-editor-title');
    dialog.innerHTML = `
        <div class="local-editor-shell">
            <header class="local-editor-top">
                <div><h2 id="local-editor-title">编辑文章 · 仅本地</h2><div class="local-editor-file" id="local-editor-file"></div></div>
                <button type="button" class="local-editor-button" id="local-editor-close">关闭</button>
            </header>
            <div class="local-editor-panes">
                <div class="local-editor-pane"><label for="local-editor-source">Markdown 原文（开头 --- 区域可修改标题、日期与摘要）</label><textarea id="local-editor-source" spellcheck="false"></textarea></div>
                <div class="local-editor-pane"><span>即时预览</span><iframe id="local-editor-preview" title="文章即时预览" sandbox="allow-same-origin"></iframe></div>
            </div>
            <footer class="local-editor-bottom"><div><div id="local-editor-status" role="status" aria-live="polite"></div><small>Ctrl / ⌘ + S 保存；关闭前会提醒未保存修改。</small></div><button type="button" class="local-editor-button primary" id="local-editor-save">保存到文件</button></footer>
        </div>`;
    document.body.appendChild(dialog);
    const source = document.getElementById('local-editor-source');
    const saveButton = document.getElementById('local-editor-save');
    const status = document.getElementById('local-editor-status');
    const preview = document.getElementById('local-editor-preview');
    const dirty = () => state && source.value !== state.saved;
    function message(text, error = false) {
        status.textContent = text;
        status.classList.toggle('error', error);
    }
    async function request(url, options) {
        const response = await fetch(url, { cache: 'no-store', ...options });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '请求失败。');
        return data;
    }
    function updatePreviewContent(doc, html, theme) {
        const article = doc.querySelector('article.post-content');
        const template = doc.createElement('template');
        template.innerHTML = html;
        const previous = Array.from(article.childNodes);
        const next = Array.from(template.content.childNodes);
        let start = 0;
        let end = 0;
        while (start < previous.length && start < next.length && previous[start].isEqualNode(next[start])) start++;
        while (end < previous.length - start && end < next.length - start &&
            previous[previous.length - 1 - end].isEqualNode(next[next.length - 1 - end])) end++;
        const scroll = doc.scrollingElement;
        const top = scroll.scrollTop;
        const left = scroll.scrollLeft;
        const anchor = end ? previous[previous.length - end] : null;
        for (let i = start; i < previous.length - end; i++) previous[i].remove();
        const fragment = doc.createDocumentFragment();
        for (let i = start; i < next.length - end; i++) fragment.appendChild(next[i]);
        article.insertBefore(fragment, anchor);
        doc.documentElement.setAttribute('data-theme', theme);
        scroll.scrollTop = top;
        scroll.scrollLeft = left;
    }
    async function renderPreview() {
        const version = ++renderVersion;
        let css;
        try {
            css = await previewStyles;
        } catch (error) {
            message(error.message, true);
            return;
        }
        if (version !== renderVersion) return;
        const body = source.value.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, '');
        const frontmatter = source.value.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        const title = frontmatter?.[1].match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1];
        const heading = document.createElement('h1');
        heading.textContent = title || '';
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        const html = typeof marked !== 'undefined' ? marked.parse(body) : '';
        const content = (title ? heading.outerHTML : '') + html;
        const doc = preview.contentDocument;
        if (doc?.querySelector('article.post-content')) {
            updatePreviewContent(doc, content, theme);
            return;
        }
        preview.srcdoc = `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><base href="${location.origin}/"><style>${css}</style><style>html{scroll-behavior:auto}html,body{width:100%;min-width:0;margin:0}body{padding:0;font-family:system-ui,sans-serif;background:var(--card)}.post-content{width:100%;max-width:820px;min-width:0;margin:0 auto;padding:32px clamp(20px,4vw,48px);border:0;border-radius:0;box-shadow:none;overflow-wrap:anywhere}.post-content h1{font-size:clamp(26px,4vw,36px);line-height:1.35;margin-bottom:28px}.post-content h1::after{display:none}.post-content p{line-height:1.9}img,svg{max-width:100%;height:auto}table{display:block;max-width:100%;overflow:auto}pre{max-width:100%;overflow:auto}</style></head><body><article class="post-content">${title ? heading.outerHTML : ''}${html}</article></body></html>`;
    }
    async function edit() {
        try {
            const id = new URLSearchParams(location.search).get('post');
            const index = await request('/posts.json');
            const post = index.posts.find(item => item.id === id);
            if (!post) throw new Error('请先打开一篇文章。');
            const data = await request('/__local/post?file=' + encodeURIComponent(post.file));
            state = { file: post.file, saved: data.content, revision: data.revision, saving: false };
            source.value = data.content;
            document.getElementById('local-editor-file').textContent = post.file;
            message('已读取文章，修改后保存到本地文件。');
            renderPreview();
            dialog.showModal();
            source.focus();
        } catch (error) {
            alert(error.message);
        }
    }
    function close() {
        if (state?.saving) return;
        if (dirty() && !confirm('还有未保存的修改，确定放弃并关闭吗？')) return;
        dialog.close();
        state = null;
    }
    async function save() {
        if (!state || state.saving) return;
        state.saving = true;
        saveButton.disabled = true;
        const content = source.value;
        message('正在保存…');
        try {
            const data = await request('/__local/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Local-Editor-Token': token },
                body: JSON.stringify({ file: state.file, content, revision: state.revision })
            });
            state.saved = content;
            state.revision = data.revision;
            message(source.value === content ? '已保存到文件，正在刷新文章…' : '已保存提交的内容，还有新修改未保存。');
            try {
                await loadPosts();
                await openPost(data.post.id, true);
                if (!dirty()) message('已保存，文章预览和索引已更新。');
            } catch (error) {
                message('文件已保存，页面刷新失败，可手动刷新查看。', true);
            }
        } catch (error) {
            message(error.message, true);
        } finally {
            state.saving = false;
            saveButton.disabled = false;
        }
    }
    source.addEventListener('input', () => {
        message(dirty() ? '有未保存的修改。' : '内容与已保存文件一致。');
        clearTimeout(renderTimer);
        renderTimer = setTimeout(renderPreview, 200);
    });
    document.getElementById('local-editor-close').addEventListener('click', close);
    saveButton.addEventListener('click', save);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            save();
        }
    });
    window.addEventListener('beforeunload', event => {
        if (dirty() || state?.saving) { event.preventDefault(); event.returnValue = ''; }
    });
    function addEntry() {
        const header = document.querySelector('#postContainer .post-header');
        if (!header || header.querySelector('.local-edit-bar')) return;
        const bar = document.createElement('div');
        bar.className = 'local-edit-bar';
        const button = document.createElement('button');
        button.className = 'local-editor-button';
        button.textContent = '编辑文章';
        button.addEventListener('click', edit);
        const hint = document.createElement('small');
        hint.textContent = '仅本地预览可用';
        bar.append(button, hint);
        header.appendChild(bar);
    }
    new MutationObserver(addEntry).observe(document.querySelector('.main'), { childList: true, subtree: true });
    addEntry();
})();
