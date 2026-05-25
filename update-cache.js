#!/usr/bin/env node
/**
 * 更新静态资源版本号（基于文件内容 MD5）
 * 每次发布前运行此脚本，即可让浏览器强制刷新缓存
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const INDEX_FILE = 'index.html';

// 计算文件的 MD5 前8位
function getFileHash(filepath) {
    const content = fs.readFileSync(filepath);
    return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
}

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 替换 index.html 中的版本号
function updateVersion(file) {
    if (!fs.existsSync(file)) {
        console.log(`  ⚠ ${file} 不存在，跳过`);
        return;
    }
    const hash = getFileHash(file);

    let html = fs.readFileSync(INDEX_FILE, 'utf-8');
    let modified = false;

    // 替换 href="file?v=xxx"
    const escapedFile = escapeRegExp(file);

    html = html.replace(new RegExp(`(href="${escapedFile}\\?v=)[^"]*"`, 'g'), (match, prefix) => {
        modified = true;
        return `${prefix}${hash}"`;
    });
    // 替换 src="file?v=xxx"
    html = html.replace(new RegExp(`(src="${escapedFile}\\?v=)[^"]*"`, 'g'), (match, prefix) => {
        modified = true;
        return `${prefix}${hash}"`;
    });

    if (modified) {
        fs.writeFileSync(INDEX_FILE, html, 'utf-8');
        console.log(`  ✓ ${file} -> ${hash}`);
    } else {
        console.log(`  - ${file} (无版本号标记，跳过)`);
    }
}

// 更新 posts.json 版本到 window.__POSTS_VERSION__
function updatePostsVersion() {
    const postsFile = 'posts.json';
    if (!fs.existsSync(postsFile)) {
        console.log(`  ⚠ ${postsFile} 不存在，跳过`);
        return;
    }
    const hash = getFileHash(postsFile);

    let html = fs.readFileSync(INDEX_FILE, 'utf-8');
    const pattern = /(window\.__POSTS_VERSION__ = ')[^']*'/;
    if (pattern.test(html)) {
        html = html.replace(pattern, `$1${hash}'`);
        fs.writeFileSync(INDEX_FILE, html, 'utf-8');
        console.log(`  ✓ ${postsFile} -> ${hash}`);
    } else {
        console.log(`  - ${postsFile} (无版本标记，跳过)`);
    }
}

function updateGiscusThemeVersion() {
    const themeFiles = ['assets/css/giscus-light.css', 'assets/css/giscus-dark.css'];
    const existingFiles = themeFiles.filter(file => fs.existsSync(file));

    if (existingFiles.length !== themeFiles.length) {
        console.log('  ⚠ giscus theme css 不完整，跳过');
        return;
    }

    const hash = crypto.createHash('md5');
    existingFiles.forEach(file => hash.update(fs.readFileSync(file)));
    const version = hash.digest('hex').slice(0, 8);

    let html = fs.readFileSync(INDEX_FILE, 'utf-8');
    const pattern = /(window\.__GISCUS_THEME_VERSION__ = ')[^']*'/;
    if (pattern.test(html)) {
        html = html.replace(pattern, `$1${version}'`);
        fs.writeFileSync(INDEX_FILE, html, 'utf-8');
        console.log(`  ✓ giscus theme css -> ${version}`);
    } else {
        console.log('  - giscus theme css (无版本标记，跳过)');
    }
}

function main() {
    console.log('🔍 更新缓存版本号...');

    updateVersion('assets/css/style.css');
    updateVersion('assets/js/main.js');
    updateVersion('assets/vendor/marked.min.js');
    updateVersion('favicon.ico');
    updatePostsVersion();
    updateGiscusThemeVersion();

    console.log('\n✅ Done. Version numbers updated in index.html');
}

main();
