#!/usr/bin/env node

/**
 * 自动扫描 posts/ 目录生成 posts.json
 * 从 Markdown 文件提取元数据
 */

const fs = require('fs');
const path = require('path');

const POSTS_DIR = 'posts';
const OUTPUT_FILE = 'posts.json';

// 从 Markdown 内容提取标题
function extractTitle(content) {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : '无标题';
}

// 从 Markdown 内容提取摘要（第一段非空文本）
function extractExcerpt(content) {
    // 移除 YAML frontmatter
    const noFrontmatter = content.replace(/^---[\s\S]*?---\n*/, '');
    // 移除标题
    const noTitle = noFrontmatter.replace(/^#\s+.+\n/m, '');
    // 找到第一个非空段落
    const paragraphs = noTitle.split('\n\n');
    for (const p of paragraphs) {
        const trimmed = p.trim();
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('```')) {
            // 移除 Markdown 标记，保留纯文本
            return trimmed
                .replace(/\*\*/g, '')
                .replace(/\*/g, '')
                .replace(/`/g, '')
                .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
                .slice(0, 150) + '...';
        }
    }
    return '暂无摘要';
}

// 从文件名或内容提取日期
function extractDate(filename, content) {
    // 尝试从文件内容找日期
    const dateMatch = content.match(/date:\s*(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) return dateMatch[1];
    
    // 从文件名提取日期 (如: 2026-02-11-post-name.md)
    const filenameDate = filename.match(/(\d{4}-\d{2}-\d{2})/);
    if (filenameDate) return filenameDate[1];
    
    // 使用文件修改时间
    const stats = fs.statSync(path.join(POSTS_DIR, filename));
    return stats.mtime.toISOString().split('T')[0];
}

// 从内容提取标签
function extractTag(content) {
    const tagMatch = content.match(/tag:\s*(.+)/);
    if (tagMatch) return tagMatch[1].trim();
    
    // 根据内容关键词判断
    if (content.includes('技术') || content.includes('代码') || content.includes('编程')) {
        return '技术';
    } else if (content.includes('生活') || content.includes('日常')) {
        return '生活';
    }
    return '随笔';
}

// 生成 URL 友好的 ID
function generateId(filename) {
    return filename
        .replace(/\.md$/i, '')
        .replace(/^\d{4}-\d{2}-\d{2}-/, '')  // 移除日期前缀
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')  // 非字母数字中文替换为 -
        .replace(/^-+|-+$/g, '');  // 移除首尾 -
}

// 主函数
function main() {
    console.log('🔍 扫描文章目录...');
    
    if (!fs.existsSync(POSTS_DIR)) {
        console.error(`❌ 目录 ${POSTS_DIR} 不存在`);
        process.exit(1);
    }
    
    const files = fs.readdirSync(POSTS_DIR)
        .filter(f => f.endsWith('.md'))
        .sort((a, b) => {
            // 按文件修改时间排序，最新的在前
            const statA = fs.statSync(path.join(POSTS_DIR, a));
            const statB = fs.statSync(path.join(POSTS_DIR, b));
            return statB.mtime - statA.mtime;
        });
    
    console.log(`📄 找到 ${files.length} 篇文章`);
    
    const posts = files.map(filename => {
        const filepath = path.join(POSTS_DIR, filename);
        const content = fs.readFileSync(filepath, 'utf-8');
        
        const post = {
            id: generateId(filename),
            title: extractTitle(content),
            excerpt: extractExcerpt(content),
            date: extractDate(filename, content),
            tag: extractTag(content),
            file: path.join(POSTS_DIR, filename).replace(/\\/g, '/')
        };
        
        console.log(`  ✓ ${post.title} (${post.date})`);
        return post;
    });
    
    // 写入 posts.json
    const output = { posts };
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
    
    console.log(`\n✅ 已生成 ${OUTPUT_FILE}`);
    console.log(`📊 共 ${posts.length} 篇文章`);
}

main();
