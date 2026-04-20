#!/bin/bash
# 更新静态资源版本号（基于文件内容 MD5）
# 每次发布前运行此脚本，即可让浏览器强制刷新缓存

cd "$(dirname "$0")"

update_v() {
    local file="$1"
    if [ -f "$file" ]; then
        local hash=$(md5sum "$file" | cut -c1-8)
        local new_v="v=$(date +%s)"
        # 替换 index.html 中的版本号
        sed -i "s|\(href=\"$file?v=\)[^\"]*|\1$hash|" index.html
        sed -i "s|\(src=\"$file?v=\)[^\"]*|\1$hash|" index.html
        echo "$file -> $hash"
    fi
}

update_v "style.css"
update_v "main.js"
update_v "vendor/marked.min.js"
update_v "favicon.ico"

echo "Done. Version numbers updated in index.html"
