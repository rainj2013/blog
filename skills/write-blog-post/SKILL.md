---
name: write-blog-post
description: Draft, revise, format, and publish Markdown posts for this static personal blog while matching the author's recent Chinese writing style, repository conventions, image layout, internal links, generated indexes, sitemap, and cache hashes. Use when creating or editing files under posts/, preparing post images under static/, checking a draft against the author's style, or completing the blog post release workflow.
---

# Write Blog Post

Create posts that read like the author's work and fit the repository's SPA and publishing pipeline.

## Establish context

Work from the repository root. Read [references/writing-and-publishing.md](references/writing-and-publishing.md) before drafting or editing a post.

Treat that reference as a baseline, not a frozen imitation. Before substantial writing, inspect the three most recent posts by frontmatter `date`; include at least one post of the same type (technical, project log, or personal essay) when available. Prefer frontmatter dates over filesystem modification times and `posts.json` order.

## Draft the article

1. Clarify the article's central claim, intended reader, and available firsthand evidence. Do not invent personal experience, measurements, sources, quotes, product behavior, or implementation details. Mark unsupported material for the user to supply or verify.
2. Build a concrete progression rather than a generic tutorial outline. For technical posts, usually move from an observed problem through mechanisms and tradeoffs to limits and a restrained conclusion. For personal posts, organize around events and reflection while retaining specific scenes.
3. Write the frontmatter and body using the repository rules in the reference. Do not add a duplicate `#` heading; the SPA renders the frontmatter title separately.
4. Use the author's direct, first-person voice. State the problem early, explain with concrete scenarios, use lists only when they sharpen a classification or process, and acknowledge uncertainty where appropriate.
5. Add diagrams or screenshots only when they clarify a relationship, process, state, or real result. Use meaningful alt text and the prescribed dated static directory.
6. End by consolidating the argument. Do not merely repeat every section or add promotional filler.

## Edit an existing draft

Preserve factual intent and the author's defensible uncertainty. Remove generic AI prose, excessive headings, slogan-like transitions, repeated conclusions, unsupported certainty, and abstractions without examples. Keep English technical terms and Chinese prose spaced consistently with nearby recent posts.

When changing a post title, rename its Markdown file in the same change so the filename continues to match the title. Preserve an existing leading date prefix when present. Before renaming, search the repository for links to the old filename and generated ID, then update those links. Because renaming changes the SPA ID and URL, warn the user and request confirmation first only when the old URL may already be public or must remain stable.

Check all local image and internal post targets. Prefer `/?post=<generated-id>` for internal post links because that is the SPA's canonical route. Derive the ID with the same rules as `generate-posts.js`; verify it in regenerated `posts.json` instead of guessing when publishing.

## Publish and verify

For any added, renamed, or edited post:

1. Run `node generate-posts.js`.
2. Run `node generate-sitemap.js`.
3. Inspect the post's generated `title`, `date`, `tag`, `excerpt`, `file`, and ID in `posts.json`.
4. Confirm every referenced local image exists.

Before manual deployment, additionally run `node update-cache.js`. This changes cache hashes in `index.html`; do not run it for a draft-only request unless the user asks to prepare deployment.

When practical, serve the repository with `python3 -m http.server 8000` and check the post list, `/?post=<id>` detail route, images, code blocks, tables, theme toggle, and view-mode toggle. Report generated-file changes and commands run.
