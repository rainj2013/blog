# Repository Guidelines

## Project Structure & Module Organization

This repository is a static personal blog. The entry point is `index.html`, with client-side behavior in `main.js` and global styling in `style.css`. Blog posts live in `posts/` as Markdown files, and `posts.json` is the generated post index consumed by the SPA. Static media belongs under `static/`; root-level assets include `favicon.ico` and `CNAME`. The local Markdown parser is vendored at `vendor/marked.min.js`, so avoid replacing it with a CDN dependency unless the deployment model changes.

## Build, Test, and Development Commands

- `node generate-posts.js`: scans `posts/`, extracts metadata, and rewrites `posts.json`.
- `node update-cache.js`: updates cache-busting hashes in `index.html` for CSS, JS, vendor, favicon, and posts index assets.
- `python3 -m http.server 8000`: serves the site locally from the repository root for browser testing.

Run `node generate-posts.js` after adding, renaming, or editing posts. Run both Node scripts before manual deployment.

## Coding Style & Naming Conventions

Use vanilla JavaScript, HTML, and CSS; do not introduce a framework without a clear need. Existing JavaScript uses 4-space indentation, `const`/`let`, CommonJS for Node scripts, and small helper functions. Keep CSS organized around existing variables and selectors in `style.css`. Markdown post filenames may be Chinese or English; date-prefixed names such as `2026-04-26-my-post.md` are supported and help metadata extraction.

## Testing Guidelines

There is no formal automated test suite. Validate changes by serving the site locally and checking the post list, post detail route, theme toggle, and view mode toggle in a browser. For content changes, confirm `posts.json` contains the expected `title`, `date`, `tag`, `excerpt`, and `file` values after regeneration.

## Commit & Pull Request Guidelines

Recent commits use short imperative prefixes, especially `fix:` and `refactor:`; follow that pattern, for example `fix: update post excerpt generation`. Pull requests should describe the user-visible change, list commands run, and include screenshots for layout or visual updates. Link related issues when applicable. For post-only changes, mention whether `posts.json` and cache hashes were regenerated.

## Deployment Notes

GitHub Actions deploys to GitHub Pages on pushes to `master`. The workflow runs `node generate-posts.js` and `node update-cache.js` before uploading the repository as the Pages artifact.
