# Writing a blog post

One post = one `.md` file in this folder. The **filename is the post id** (`qhack-tenderflow.md` → `qhack-tenderflow`), so keep it URL-safe. Nothing else needs to be edited — `src/data/blogData.ts` picks up new files automatically and sorts posts newest-first by `date`.

Prefix a filename with `_` (`_half-finished.md`) to keep it as an unpublished draft. This README is skipped too.

## Frontmatter

```md
---
title: Building TenderFlow at Q-Hack (Mannheim, Germany)
excerpt: One or two sentences shown on the post list card.
date: 2026-05-03
category: Hackathon
tags: [langgraph, ai-agents, llm]
author: Mirang Bhandari
authorTitle: Software Engineer
readTime: 5 min read
---
```

`title`, `excerpt`, `date` (`YYYY-MM-DD`) and `category` are required — a missing one logs a dev-console warning. `tags`, `author`, `authorTitle` and `readTime` are optional; **omit `readTime` and it is estimated from the word count**. Values are plain text: no quotes or escaping needed, and a `:` inside the value is fine.

## Body syntax

| You write | You get |
| --- | --- |
| `## Section` / `### Sub-section` | Heading (levels 1–3) |
| Plain text, blank line between | Paragraph |
| `- item` | Bulleted list |
| `1. item` | Numbered list |
| ` ```python ` … ` ``` ` | Code block with a language label |
| `> quoted text` | Pull quote |
| `---` on its own line | Divider |

Inside paragraphs, list items, quotes and callouts you can use `**bold**` (renders as a highlight) and `` `code` `` (renders as an inline chip).

### Images

```md
![alt text](q-hack.jpg "Optional caption")
```

Put the image in `src/assets/` and reference it **by filename only** — no import, no path. Full URLs (`https://…`) and files in `public/` (`/thing.png`) also work. A filename that doesn't resolve logs a dev-console warning.

### Callouts

```md
::: tip Why the cap matters
A `$0.005` ceiling means the worst case is half a cent — **not** a drained wallet.
:::
```

Variants: `info`, `tip`, `warning`, `note`. The text after the variant is an optional title; leave it off to use the default label.

### Quotes with attribution

A trailing `— Name` line inside the quote becomes the attribution:

```md
> The best AI products remove the tedious parts of a job.
>
> — Mirang Bhandari
```

## Adding a new block type

Blocks are parsed in `src/lib/blogMarkdown.ts` and rendered in `src/components/BlogContent.tsx` — add the variant to the `BlogContent` union, a branch in `parseBlocks`, and a `case` in the renderer's switch.
