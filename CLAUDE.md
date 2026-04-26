# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static blog website for rainj2013. The blog features:
- Posts written in Markdown, stored in `posts/`
- Client-side SPA rendering with vanilla JavaScript (no framework)
- Dark/light theme toggle
- Two view modes: card grid and compact list

## Architecture

```
posts/           - Markdown blog posts
posts.json       - Auto-generated index of all posts (id, title, excerpt, date, tag, file)
index.html       - Single HTML entry point with SPA behavior
main.js          - Client-side routing, post loading, Markdown rendering via marked.js
style.css        - All styles (CSS variables for theming)
vendor/marked.min.js - Markdown parser (local copy to avoid CDN)
generate-posts.js    - CLI tool: scans posts/, extracts metadata, generates posts.json
update-cache.js      - CLI tool: updates cache-busting version hashes in index.html
```

## Common Commands

```bash
# Generate/update posts.json after adding new Markdown files
node generate-posts.js

# Update cache version hashes before deploying (ensures browsers reload changed files)
node update-cache.js
```

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) automatically:
1. Runs `node generate-posts.js`
2. Runs `node update-cache.js`
3. Deploys to GitHub Pages on push to `master`

Manual deploy requires running both scripts before pushing.

## Adding a New Post

1. Create a Markdown file in `posts/` (e.g., `posts/2026-04-26-my-new-post.md`)
2. The file should have a first-level heading `# Title` and content
3. Commit and push — CI/CD handles the rest

## Cache Busting

`update-cache.js` computes MD5 hashes of `style.css`, `main.js`, `vendor/marked.min.js`, `favicon.ico`, and `posts.json`, then embeds them as version query params in `index.html`. This ensures browsers fetch updated files after deployment.
