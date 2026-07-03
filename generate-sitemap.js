#!/usr/bin/env node

/**
 * 自动扫描 posts/ 目录生成 sitemap.xml
 * 让搜索引擎发现所有文章页面
 */

const fs = require('fs');
const path = require('path');

const POSTS_DIR = 'posts';
const OUTPUT_FILE = 'sitemap.xml';
const BASE_URL = (() => {
    try {
        const cname = fs.readFileSync('CNAME', 'utf-8').trim();
        return 'https://' + cname;
    } catch {
        return 'https://rainj2013.top';
    }
})();

// 从 Markdown 内容提取标题
function extractTitle(content) {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (frontmatterMatch) {
        const titleMatch = frontmatterMatch[1].match(/^title:\s*["']?(.+?)["']?\s*$/m);
        if (titleMatch) return titleMatch[1].trim();
    }
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : '无标题';
}

// 从内容提取最后修改日期
function extractDate(filename, content) {
    const dateMatch = content.match(/date:\s*(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) return dateMatch[1];
    const filenameDate = filename.match(/(\d{4}-\d{2}-\d{2})/);
    if (filenameDate) return filenameDate[1];
    const stats = fs.statSync(path.join(POSTS_DIR, filename));
    return stats.mtime.toISOString().split('T')[0];
}

// 生成 URL 友好的 ID（与 generate-posts.js 一致）
function generateId(filename) {
    return filename
        .replace(/\.md$/i, '')
        .replace(/^\d{4}-\d{2}-\d{2}-/, '')
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function escapeXml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function main() {
    console.log('🔍 扫描文章目录，生成 sitemap...');

    if (!fs.existsSync(POSTS_DIR)) {
        console.error(`❌ 目录 ${POSTS_DIR} 不存在`);
        process.exit(1);
    }

    const files = fs.readdirSync(POSTS_DIR)
        .filter(f => f.endsWith('.md'));

    console.log(`📄 找到 ${files.length} 篇文章`);

    // 生成 XML
    const urls = files.map(filename => {
        const filepath = path.join(POSTS_DIR, filename);
        const content = fs.readFileSync(filepath, 'utf-8');
        const title = extractTitle(content);
        const date = extractDate(filename, content);
        const id = generateId(filename);

        return `  <url>
    <loc>${escapeXml(BASE_URL + '/?post=' + id)}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }).join('\n');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
${urls}
</urlset>`;

    fs.writeFileSync(OUTPUT_FILE, sitemap, 'utf-8');

    console.log(`✅ 已生成 ${OUTPUT_FILE}`);
    console.log(`📊 共 ${files.length + 1} 个 URL（首页 + ${files.length} 篇文章）`);
}

main();
