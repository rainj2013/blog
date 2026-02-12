// 博客配置
const config = {
    postsIndex: 'posts.json',
    postsDir: 'posts'
};

// 获取当前域名（用于绝对路径）
const baseUrl = window.location.origin;

// DOM 元素
const postsContainer = document.getElementById('postsContainer');
const themeToggle = document.getElementById('themeToggle');

// 配置 marked.js 启用表格和其他 GFM 特性
function initMarked() {
    if (typeof marked !== 'undefined') {
        marked.use({
            gfm: true,
            tables: true,
            breaks: false,
            pedantic: false,
            sanitize: false,
            smartLists: true,
            smartypants: true,
            xhtml: false
        });
        console.log('marked.js configured with GFM tables');
    } else {
        console.error('marked.js not loaded');
    }
}

// 初始化
async function init() {
    initMarked();  // 先配置 marked.js
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
                <p style="font-size: 0.875rem; margin-top: 1rem;">${error.message}</p>
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

// 打开文章详情 - 在当前页显示，避免跨窗口路径问题
async function openPost(postId) {
    try {
        // 先加载索引获取文章信息
        const indexResponse = await fetch(config.postsIndex);
        const indexData = await indexResponse.json();
        const post = indexData.posts.find(p => p.id === postId);
        
        if (!post) {
            throw new Error('Post not found');
        }
        
        // 加载 Markdown 内容（使用绝对路径）
        const postUrl = `${baseUrl}/${post.file}`;
        const contentResponse = await fetch(postUrl);
        if (!contentResponse.ok) {
            throw new Error(`Failed to load: ${postUrl}`);
        }
        const markdownContent = await contentResponse.text();
        
        // 在当前页渲染文章
        showPostPage(post, markdownContent);
        
    } catch (error) {
        console.error('Error opening post:', error);
        alert('加载文章失败：' + error.message);
    }
}

// 显示文章页面（SPA方式，避免新窗口路径问题）
function showPostPage(post, markdownContent) {
    // 隐藏首页内容，显示文章
    const main = document.querySelector('.main');
    const hero = document.querySelector('.hero');
    const postsSection = document.querySelector('.posts-section');
    
    // 隐藏首页元素
    if (hero) hero.style.display = 'none';
    if (postsSection) postsSection.style.display = 'none';
    
    // 创建文章容器
    let postContainer = document.getElementById('postContainer');
    if (!postContainer) {
        postContainer = document.createElement('div');
        postContainer.id = 'postContainer';
        postContainer.className = 'container';
        main.appendChild(postContainer);
    }
    
    // 渲染文章内容
    postContainer.innerHTML = `
        <article class="post-content" style="margin-top: 2rem;">
            <div class="post-header" style="text-align: center; padding: 2rem 0; border-bottom: 1px solid var(--border-color); margin-bottom: 2rem;">
                <h1>${post.title}</h1>
                <div class="post-detail-meta">
                    <span class="post-detail-date">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        ${post.date}
                    </span>
                    <span class="post-detail-tag">${post.tag}</span>
                </div>
            </div>
            <div id="postBody"></div>
            <button onclick="backToHome()" style="margin-top: 3rem; padding: 0.75rem 1.5rem; background: var(--primary-color); color: white; border: none; border-radius: var(--radius); cursor: pointer; font-size: 1rem;">
                ← 返回首页
            </button>
        </article>
    `;
    postContainer.style.display = 'block';
    
    // 渲染 Markdown（移除 frontmatter）
    if (typeof marked !== 'undefined') {
        // 移除 frontmatter (---\n...\n---)
        const contentWithoutFrontmatter = markdownContent.replace(/^---\n[\s\S]*?\n---\n*/, '');
        document.getElementById('postBody').innerHTML = marked.parse(contentWithoutFrontmatter);
    } else {
        document.getElementById('postBody').innerHTML = '<pre>' + markdownContent + '</pre>';
    }
    
    // 滚动到顶部
    window.scrollTo(0, 0);
}

// 返回首页
function backToHome() {
    showHomePage();
}

// 主题切换
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

// 加载保存的主题 - 默认深色
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
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
    
    // 首页按钮
    const homeLink = document.getElementById('homeLink');
    if (homeLink) {
        homeLink.addEventListener('click', (e) => {
            e.preventDefault();
            showHomePage();
        });
    }
    
    // 关于按钮
    const aboutLink = document.getElementById('aboutLink');
    if (aboutLink) {
        aboutLink.addEventListener('click', (e) => {
            e.preventDefault();
            showAboutPage();
        });
    }
}

// 显示首页
function showHomePage() {
    const hero = document.querySelector('.hero');
    const postsSection = document.querySelector('.posts-section');
    const postContainer = document.getElementById('postContainer');
    const aboutContainer = document.getElementById('aboutContainer');
    
    // 更新导航状态
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById('homeLink').classList.add('active');
    
    // 显示首页元素
    if (hero) hero.style.display = 'block';
    if (postsSection) postsSection.style.display = 'block';
    if (postContainer) postContainer.style.display = 'none';
    if (aboutContainer) aboutContainer.style.display = 'none';
    
    window.scrollTo(0, 0);
}

// 显示关于页面
function showAboutPage() {
    const hero = document.querySelector('.hero');
    const postsSection = document.querySelector('.posts-section');
    const postContainer = document.getElementById('postContainer');
    const main = document.querySelector('.main');
    
    // 更新导航状态
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById('aboutLink').classList.add('active');
    
    // 隐藏首页和文章
    if (hero) hero.style.display = 'none';
    if (postsSection) postsSection.style.display = 'none';
    if (postContainer) postContainer.style.display = 'none';
    
    // 创建或显示关于容器
    let aboutContainer = document.getElementById('aboutContainer');
    if (!aboutContainer) {
        aboutContainer = document.createElement('div');
        aboutContainer.id = 'aboutContainer';
        aboutContainer.className = 'container';
        aboutContainer.innerHTML = `
            <div class="post-content" style="margin-top: 2rem; max-width: 800px; margin-left: auto; margin-right: auto;">
                <h1 style="text-align: center; margin-bottom: 2rem;">关于</h1>
                <div style="line-height: 1.8;">
                    <p style="margin-bottom: 1.5rem;">👋 你好，我是 rainj2013。</p>
                    <p style="margin-bottom: 1.5rem;">这是我的个人博客，主要分享技术文章、学习笔记和个人思考。</p>
                    <h3 style="margin: 2rem 0 1rem;">关注我</h3>
                    <ul style="margin-left: 2rem; line-height: 2;">
                        <li>GitHub: <a href="https://github.com/rainj2013" target="_blank" style="color: var(--primary-color);">@rainj2013</a></li>
                        <li>微信公众号: 搜索 <strong>rainj2013</strong></li>
                    </ul>
                    <h3 style="margin: 2rem 0 1rem;">联系方式</h3>
                    <p>欢迎通过 GitHub 与我交流。</p>
                </div>
                <button onclick="showHomePage()" style="margin-top: 3rem; padding: 0.75rem 1.5rem; background: var(--primary-color); color: white; border: none; border-radius: var(--radius); cursor: pointer; font-size: 1rem;">
                    ← 返回首页
                </button>
            </div>
        `;
        main.appendChild(aboutContainer);
    }
    aboutContainer.style.display = 'block';
    
    window.scrollTo(0, 0);
}

// 启动
document.addEventListener('DOMContentLoaded', init);
