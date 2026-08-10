// ─── Markdown → BlogContent block parser ────────────────────────────────────
// Posts live as plain .md files in src/content/blog/. This turns one file into
// the BlogPost shape that BlogContent.tsx renders. See content/blog/README.md
// for the authoring syntax.

export interface BlogAuthor {
  name: string;
  title?: string;
}

export type BlogContent =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'image'; url: string; alt: string; caption?: string }
  | { type: 'code'; language: string; content: string }
  | { type: 'quote'; text: string; author?: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'callout'; variant: 'info' | 'tip' | 'warning' | 'note'; title?: string; text: string }
  | { type: 'divider' };

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  tags?: string[];
  author?: BlogAuthor;
  content: BlogContent[];
}

type Block<T extends BlogContent['type']> = Extract<BlogContent, { type: T }>;

/** Resolves an image reference in markdown to a real URL. */
export type AssetResolver = (src: string) => string;

const CALLOUT_VARIANTS = ['info', 'tip', 'warning', 'note'] as const;
// Tuned so the estimate lands near the read times that were previously
// hand-written on these posts. Override per post with `readTime:` frontmatter.
const WORDS_PER_MINUTE = 150;

// ─── Frontmatter ────────────────────────────────────────────────────────────

type Frontmatter = Record<string, string | string[]>;

const unquote = (s: string) =>
  s.length >= 2 && ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))
    ? s.slice(1, -1)
    : s;

function parseFrontmatter(raw: string): { data: Frontmatter; body: string } {
  const match = /^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(raw);
  if (!match) return { data: {}, body: raw };

  const data: Frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const sep = trimmed.indexOf(':');
    if (sep === -1) continue;

    const key = trimmed.slice(0, sep).trim();
    const value = trimmed.slice(sep + 1).trim();
    if (!key) continue;

    data[key] = value.startsWith('[') && value.endsWith(']')
      ? value.slice(1, -1).split(',').map(v => unquote(v.trim())).filter(Boolean)
      : unquote(value);
  }

  return { data, body: raw.slice(match[0].length) };
}

const str = (v: string | string[] | undefined): string | undefined =>
  typeof v === 'string' && v !== '' ? v : undefined;

const list = (v: string | string[] | undefined): string[] | undefined => {
  if (Array.isArray(v)) return v.length ? v : undefined;
  const single = str(v);
  if (!single) return undefined;
  const items = single.split(',').map(s => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
};

// ─── Body ───────────────────────────────────────────────────────────────────

const RE = {
  fence:    /^```([\w+-]*)\s*$/,
  endFence: /^```\s*$/,
  callout:  /^:::\s*(\w+)\s*(.*)$/,
  divider:  /^(?:-{3,}|\*{3,}|_{3,})$/,
  heading:  /^(#{1,3})\s+(.+)$/,
  image:    /^!\[([^\]]*)\]\(\s*(\S+?)(?:\s+["']([^"']*)["'])?\s*\)$/,
  bullet:   /^[-*+]\s+(.*)$/,
  numbered: /^\d+[.)]\s+(.*)$/,
  attrib:   /^(?:—|–|--)\s*(.+)$/,
  blockish: /^(?:#{1,3}\s|```|:::|>)/,
};

function parseBlocks(body: string, resolveAsset: AssetResolver): BlogContent[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const blocks: BlogContent[] = [];
  let paragraph: string[] = [];
  let i = 0;

  const flush = () => {
    const text = paragraph.join(' ').trim();
    paragraph = [];
    if (text) blocks.push({ type: 'paragraph', text });
  };

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) { flush(); i++; continue; }

    // ── Fenced code ───────────────────────────────────────────────────────
    const fence = RE.fence.exec(line);
    if (fence) {
      flush();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !RE.endFence.test(lines[i].trim())) buf.push(lines[i++]);
      i++; // closing fence
      blocks.push({ type: 'code', language: fence[1] || 'text', content: buf.join('\n') });
      continue;
    }

    // ── Callout — ::: info Optional Title … ::: ────────────────────────────
    const callout = RE.callout.exec(line);
    if (callout) {
      flush();
      const variant = callout[1].toLowerCase();
      const buf: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== ':::') buf.push(lines[i++].trim());
      i++; // closing :::

      const block: Block<'callout'> = {
        type: 'callout',
        variant: (CALLOUT_VARIANTS as readonly string[]).includes(variant)
          ? (variant as Block<'callout'>['variant'])
          : 'note',
        text: buf.join(' ').trim(),
      };
      const title = callout[2].trim();
      if (title) block.title = title;
      blocks.push(block);
      continue;
    }

    // ── Divider ───────────────────────────────────────────────────────────
    if (RE.divider.test(line)) { flush(); blocks.push({ type: 'divider' }); i++; continue; }

    // ── Heading ───────────────────────────────────────────────────────────
    const heading = RE.heading.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2].trim() });
      i++;
      continue;
    }

    // ── Image — ![alt](file.jpg "caption") ────────────────────────────────
    const image = RE.image.exec(line);
    if (image) {
      flush();
      const block: Block<'image'> = { type: 'image', url: resolveAsset(image[2]), alt: image[1] };
      if (image[3]) block.caption = image[3];
      blocks.push(block);
      i++;
      continue;
    }

    // ── Blockquote — trailing "— Name" line becomes the attribution ───────
    if (line.startsWith('>')) {
      flush();
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        buf.push(lines[i++].trim().replace(/^>\s?/, ''));
      }
      while (buf.length && !buf[buf.length - 1]) buf.pop();

      let author: string | undefined;
      const attrib = buf.length ? RE.attrib.exec(buf[buf.length - 1]) : null;
      if (attrib && buf.length > 1) {
        author = attrib[1].trim();
        buf.pop();
        while (buf.length && !buf[buf.length - 1]) buf.pop();
      }

      const block: Block<'quote'> = { type: 'quote', text: buf.join(' ').trim() };
      if (author) block.author = author;
      blocks.push(block);
      continue;
    }

    // ── Lists ─────────────────────────────────────────────────────────────
    const ordered = RE.numbered.test(line);
    const itemRe = ordered ? RE.numbered : RE.bullet;
    if (ordered || RE.bullet.test(line)) {
      flush();
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        if (!current) break;

        const item = itemRe.exec(current);
        if (item) { items.push(item[1].trim()); i++; continue; }

        // wrapped continuation of the previous item
        if (items.length && !RE.blockish.test(current) && !RE.bullet.test(current) && !RE.numbered.test(current)) {
          items[items.length - 1] += ` ${current}`;
          i++;
          continue;
        }
        break;
      }

      const block: Block<'list'> = { type: 'list', items };
      if (ordered) block.ordered = true;
      blocks.push(block);
      continue;
    }

    paragraph.push(line);
    i++;
  }

  flush();
  return blocks;
}

// ─── Read time ──────────────────────────────────────────────────────────────

const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);

function estimateReadTime(blocks: BlogContent[]): string {
  let words = 0;
  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
      case 'heading':
      case 'quote':
      case 'callout': words += countWords(block.text); break;
      case 'list':    words += block.items.reduce((n, item) => n + countWords(item), 0); break;
      case 'code':    words += Math.ceil(countWords(block.content) / 2); break;
      default: break;
    }
  }
  return `${Math.max(1, Math.round(words / WORDS_PER_MINUTE))} min read`;
}

// ─── Entry point ────────────────────────────────────────────────────────────

/**
 * Turns one markdown file into a BlogPost.
 * `id` is the filename without extension; `resolveAsset` maps image references
 * in the markdown to bundled asset URLs.
 */
export function parseBlogPost(id: string, raw: string, resolveAsset: AssetResolver): BlogPost {
  const { data, body } = parseFrontmatter(raw);
  const content = parseBlocks(body, resolveAsset);

  if (import.meta.env.DEV) {
    for (const field of ['title', 'excerpt', 'date', 'category'] as const) {
      if (!str(data[field])) console.warn(`[blog] "${id}.md" is missing frontmatter field: ${field}`);
    }
  }

  const post: BlogPost = {
    id,
    title: str(data.title) ?? id,
    excerpt: str(data.excerpt) ?? '',
    date: str(data.date) ?? '',
    readTime: str(data.readTime) ?? estimateReadTime(content),
    category: str(data.category) ?? 'Uncategorised',
    content,
  };

  const tags = list(data.tags);
  if (tags) post.tags = tags;

  const authorName = str(data.author);
  if (authorName) {
    post.author = { name: authorName };
    const authorTitle = str(data.authorTitle);
    if (authorTitle) post.author.title = authorTitle;
  }

  return post;
}
