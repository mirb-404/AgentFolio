import { parseBlogPost } from '../lib/blogMarkdown';
import type { AssetResolver, BlogPost } from '../lib/blogMarkdown';

export type { BlogAuthor, BlogContent, BlogPost } from '../lib/blogMarkdown';

// ─── Adding a post ──────────────────────────────────────────────────────────
// Drop a new .md file into src/content/blog/ — the filename (minus .md) is the
// post id used in URLs. Nothing here needs editing. See content/blog/README.md.

// README.md is the authoring guide, and a leading _ marks an unpublished draft.
const postFiles = import.meta.glob<string>(
  ['../content/blog/*.md', '!../content/blog/README.md', '!../content/blog/_*.md'],
  { query: '?raw', import: 'default', eager: true },
);

// Every image in src/assets/ is bundled and looked up by filename, so markdown
// only ever needs to say ![alt](q-hack.jpg "caption").
const assetFiles = import.meta.glob<string>('../assets/**/*.{png,jpg,jpeg,gif,webp,avif,svg}', {
  import: 'default',
  eager: true,
});

const assetsByName = new Map<string, string>();
for (const [path, url] of Object.entries(assetFiles)) {
  const file = path.split('/').pop();
  if (!file) continue;
  assetsByName.set(file, url);
  assetsByName.set(file.replace(/\.[^.]+$/, ''), url);
}

const resolveAsset: AssetResolver = (src) => {
  if (/^(?:https?:)?\/\//.test(src) || src.startsWith('/') || src.startsWith('data:')) return src;

  const file = src.split('/').pop() ?? src;
  const url = assetsByName.get(file) ?? assetsByName.get(file.replace(/\.[^.]+$/, ''));
  if (url) return url;

  if (import.meta.env.DEV) console.warn(`[blog] no asset found in src/assets for "${src}"`);
  return src;
};

const idFromPath = (path: string) => (path.split('/').pop() ?? path).replace(/\.md$/, '');

export const blogPosts: BlogPost[] = Object.entries(postFiles)
  .map(([path, raw]) => parseBlogPost(idFromPath(path), raw, resolveAsset))
  .sort((a, b) => b.date.localeCompare(a.date)); // newest first

export const getBlogById = (id: string): BlogPost | undefined =>
  blogPosts.find(post => post.id === id);

export const getCategories = (): string[] =>
  [...new Set(blogPosts.map(post => post.category))];
