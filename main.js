// 博客配置
const config = {
    postsIndex: 'posts.json',
    postsDir: 'posts'
};

// DOM 元素
const postsContainer = document.getElementById('postsContainer');
const themeToggle = document.getElementById('themeToggle');

// 初始化
async function init() {
    loadTheme();
    setupEventListeners();
    await loadPosts();
}

// 加载文章列表
async function loadPosts() {
    if (!postsContainer) return;
    
    try {
        const response = await fetch(config.postsIndex);
        if (!response.ok) {
            throw new Error('Failed to load posts index');
        }
        const data = await response.json();
        renderPosts(data.posts);
    } catch (error) {
        console.error('Error loading posts:', error);
        postsContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <p>加载文章失败，请稍后重试</p>
            </div>
        `;
    }
}

// 渲染文章列表
function renderPosts(posts) {
    if (!posts || posts.length === 0) {
        postsContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <p>暂无文章</p>
            </div>
        `;
        return;
    }
    
    // 按日期排序（最新的在前）
    const sortedPosts = posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    postsContainer.innerHTML = sortedPosts.map((post, index) => `
        <article class="post-card" onclick="openPost('${post.id}')" style="animation-delay: ${index * 0.1}s">
            <h3 class="post-title">${post.title}</h3>
            <p class="post-excerpt">${post.excerpt}</p>
            <div class="post-meta">
                <span class="post-date">📅 ${post.date}</span>
                <span class="post-tag">${post.tag}</span>
            </div>
        </article>
    `).join('');
}

// 打开文章详情
async function openPost(postId) {
    try {
        // 先加载索引获取文章信息
        const indexResponse = await fetch(config.postsIndex);
        const indexData = await indexResponse.json();
        const post = indexData.posts.find(p => p.id === postId);
        
        if (!post) {
            throw new Error('Post not found');
        }
        
        // 加载 Markdown 内容
        const contentResponse = await fetch(post.file);
        if (!contentResponse.ok) {
            throw new Error('Failed to load post content');
        }
        const markdownContent = await contentResponse.text();
        
        // 渲染文章页面
        const postHTML = createPostPage(post, markdownContent);
        
        // 打开新页面
        const newWindow = window.open();
        newWindow.document.write(postHTML);
        newWindow.document.close();
        
    } catch (error) {
        console.error('Error opening post:', error);
        alert('加载文章失败，请稍后重试');
    }
}

// 创建文章详情页 HTML
function createPostPage(post, markdownContent) {
    return `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${post.title} - 我的博客</title>
            <link rel="stylesheet" href="style.css">
            <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>
            <style>
                .post-header {
                    text-align: center;
                    padding: 2rem 0;
                    border-bottom: 1px solid var(--border-color);
                    margin-bottom: 2rem;
                }
                .post-header h1 {
                    font-size: 2rem;
                    margin-bottom: 1rem;
                }
            </style>
        </head>
        <body>
            <header class="header">
                <div class="container">
                    <h1 class="logo" onclick="location.href='index.html'" style="cursor:pointer">📝 我的博客</h1>
                    <nav class="nav">
                        <a href="index.html" class="nav-link">首页</a>
                        <button class="theme-toggle" id="themeToggle">🌙</button>
                    </nav>
                </div>
            </header>
            
            <main class="main">
                <div class="container">
                    <article class="post-content">
                        <div class="post-header">
                            <h1>${post.title}</h1>
                            <div class="post-meta" style="justify-content: center; gap: 1rem;">
                                <span>📅 ${post.date}</span>
                                <span class="post-tag">${post.tag}</span>
                            </div>
                        </div>
                        <div id="postBody"></div>
                        <button onclick="location.href='index.html'" 
                            style="margin-top: 3rem; padding: 0.75rem 1.5rem; background: var(--primary-color); color: white; border: none; border-radius: var(--radius); cursor: pointer; font-size: 1rem;"
                        >
                            ← 返回首页
                        </button>
                    </article>
                </div>
            </main>
            
            <footer class="footer">
                <div class="container">
                    <p>&copy; 2026 我的博客. Powered by ❤️</p>
                </div>
            </footer>
            
            <script>
                // 配置 marked.js
                marked.setOptions({
                    highlight: function(code, lang) {
                        return code;
                    },
                    breaks: true,
                    gfm: true
                });
                
                // 渲染 Markdown
                const markdownContent = ${JSON.stringify(markdownContent)};
                document.getElementById('postBody').innerHTML = marked.parse(markdownContent);
                
                // 主题切换
                const themeToggle = document.getElementById('themeToggle');
                const savedTheme = localStorage.getItem('theme') || 'light';
                document.documentElement.setAttribute('data-theme', savedTheme);
                themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
                
                themeToggle.addEventListener('click', () => {
                    const currentTheme = document.documentElement.getAttribute('data-theme');
                    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                    document.documentElement.setAttribute('data-theme', newTheme);
                    localStorage.setItem('theme', newTheme);
                    themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
                });
            <\/script>
        </body>
        </html>
    `;
}

// 主题切换
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

// 加载保存的主题
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (themeToggle) {
        themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
}

// 设置事件监听
function setupEventListeners() {
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

// 启动
document.addEventListener('DOMContentLoaded', init);
