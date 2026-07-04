# Writing and publishing reference

## Source sample

This guide was derived primarily from the five newest posts by frontmatter date at the time of creation:

- `为什么有些大厂做不好 AI 转型？` (2026-06-27)
- `从代码验证到 Eval 体系：再谈 AI 生成代码的质量保障` (2026-06-16)
- `Ward Agent 的一次上下文压缩策略优化` (2026-06-11)
- `31岁，我给自己放了一个Gap Month` (2026-06-08)
- `不要 Review AI 写的代码` (2026-06-02)

Recheck newer posts before writing because the style can evolve.

## Voice and reasoning

- Write in clear, conversational Chinese with a first-person engineering perspective. Sound like a practitioner thinking in public, not a textbook or press release.
- Open with the real trigger: a recent implementation, an observed problem, feedback on an earlier post, an article that prompted reflection, or a concrete life event.
- State the main tension early. Common forms include local speed versus end-to-end delivery, code generation versus trustworthy verification, or context reuse versus prompt stability.
- Move repeatedly from abstraction to a concrete scenario, workflow, metric, boundary value, UI state, or failure mode. Examples carry the argument.
- Explain mechanisms and tradeoffs. Avoid treating a new term as a complete solution merely because it has a name.
- Use candid qualifiers when evidence is limited: distinguish observation, inference, proposal, and verified result. A short explicit disclaimer is appropriate for claims outside firsthand authority.
- Prefer restrained conclusions such as “先把主路径跑顺” or “这次做的是从能用推进到更稳”. Mention remaining limitations rather than claiming completeness.
- Allow occasional colloquial phrasing, analogies, and dry humor, especially in personal posts. Do not overuse slogans.

## Typical structures

### Technical argument

Use a flexible sequence such as:

1. Describe the observed change or problem.
2. Explain why the obvious/default approach is insufficient.
3. Split the issue into mechanisms, layers, or verification dimensions.
4. Ground each section in an example, workflow, metric, or diagram.
5. Discuss organizational or engineering constraints and unresolved weaknesses.
6. Summarize the central judgment and what should be measured or done next.

### Project implementation log

Use a flexible sequence such as:

1. Name the external trigger and the project's previous state.
2. List the concrete gaps.
3. State a small number of design principles.
4. Explain each upgrade with before/after behavior and rationale.
5. Show actual UI or architecture artifacts.
6. List work deliberately deferred.
7. Summarize practical effects without presenting them as formal benchmarks unless measured.

### Personal essay

Start with the event and why it mattered. Use themed sections, specific scenes, quotations, hobbies, travel, food, games, or work experiences where authentic. Connect technical concepts to life only when the analogy improves the reflection. End with a personal conclusion rather than general life advice.

## Paragraphs and formatting

- Use several substantial opening paragraphs before the first section when context needs room.
- Use `##` for main sections. Recent posts do not put a Markdown `#` title in the body.
- Keep headings claim-oriented and specific: “局部节点变快，整条流水线未必变快” is stronger than “问题分析”.
- Use numbered lists for ordered workflows or maturity levels; use bullets for dimensions, symptoms, effects, and deferred work.
- Use bold sparingly for a pivotal claim or warning. Use blockquotes for quotations or a compact definition.
- Use fenced code blocks for commands, structured data, or literal sample output. Add a language tag when applicable.
- Horizontal rules appear in some implementation logs and personal essays as section separators but are not mandatory.
- Link sources inline at the claim they support. Never fabricate citations or quotations.

## Markdown file contract

Store posts in `posts/` as UTF-8 Markdown. Use this frontmatter:

```markdown
---
title: "文章标题"
date: YYYY-MM-DD
tag: AI工程
excerpt: "一句具体、独立可读的摘要。"
---

正文从普通段落开始。
```

- Quote `title` and `excerpt`; keep `date` in ISO format.
- `excerpt` is technically optional but recommended. Keep it concise because `generate-posts.js` truncates it to 90 characters and pads the card to three lines.
- If `excerpt` is absent, the generator takes the first suitable non-heading, non-code paragraph.
- Use an existing, semantically accurate tag when possible. Recent tags include `AI工程`, `AI技术`, `Agent`, `MCP`, `OpenClaw`, and `生活`.
- Use a descriptive Chinese or English filename. A leading `YYYY-MM-DD-` is supported but not required. Renaming changes the SPA post ID and can break links.

## Images and links

- Put post-specific media in `static/YYYY-MM-DD/`, normally using the article date. Keep shared media such as the QR code directly under `static/`.
- Reference media with a root-relative URL:

```markdown
![能说明内容的替代文本](/static/2026-06-27/example.png)
```

- Keep image source files at useful resolution; do not embed base64 data or add CDN dependencies.
- The site uses `marked` with GFM support, so ordinary tables, lists, blockquotes, and fenced code blocks are valid.
- The SPA route is `/?post=<id>`. The ID is generated from the filename by removing `.md` and an optional date prefix, lowercasing, replacing non-ASCII-letter/digit/Chinese runs with `-`, and trimming dashes.
- Prefer IDs copied from regenerated `posts.json` for cross-post links:

```markdown
[相关文章](/?post=不要review-ai写的代码)
```

## Generated files and scripts

### `node generate-posts.js`

Scan `posts/*.md` and rewrite `posts.json`. Extract title, excerpt, date, tag, file, generated ID, and the first eight MD5 characters of each post. Run after adding, renaming, or editing any post. Note that list ordering currently follows file modification time, not frontmatter date.

### `node generate-sitemap.js`

Scan posts and rewrite `sitemap.xml` with the homepage plus `/?post=<id>` URLs. Read the domain from `CNAME`, add each post's extracted date as `lastmod`, and use today's date for the homepage. Run after adding, renaming, or editing posts.

### `node update-cache.js`

Hash CSS, JavaScript, the vendored Markdown parser, favicon, `posts.json`, and Giscus theme CSS; update version values in `index.html`. Run before manual deployment after the generated post index is current. GitHub Actions already runs `generate-posts.js` and `update-cache.js` on pushes to `master`, but the repository guidelines still require all three Node scripts before manual deployment.

## Final checks

- Confirm the opening states a real problem or event and the conclusion follows from the body.
- Distinguish measured results from expectations or design rationale.
- Check dates, numbers, product names, technical terms, quotes, and external claims.
- Confirm frontmatter parses and does not appear in rendered content.
- Confirm image paths and internal links work from the root-hosted SPA.
- Review `posts.json` rather than assuming metadata extraction succeeded.
