import fs from 'node:fs';
import path from 'node:path';
import GithubSlugger from 'github-slugger';
import matter from 'gray-matter';

export interface NavItem {
  title: string;
  path?: string;
  children?: NavItem[];
}

const DOCS_DIR = path.join(process.cwd(), 'docs');

export function getNav(): NavItem[] {
  return JSON.parse(fs.readFileSync(path.join(DOCS_DIR, 'nav.json'), 'utf-8'));
}

function pathToSlug(filePath: string): string[] {
  return filePath
    .replace(/\.md$/, '')
    .replace(/\/index$/, '')
    .split('/');
}

function slugToFilePath(slug: string[]): string | null {
  const joined = slug.join('/');
  const directPath = path.join(DOCS_DIR, `${joined}.md`);
  if (fs.existsSync(directPath)) return directPath;
  const indexPath = path.join(DOCS_DIR, joined, 'index.md');
  if (fs.existsSync(indexPath)) return indexPath;
  return null;
}

export function getDocBySlug(slug: string[]) {
  const filePath = slugToFilePath(slug);
  if (!filePath) return null;
  const source = fs.readFileSync(filePath, 'utf-8');
  const { content, data: frontmatter } = matter(source);
  const toc = extractTOC(content);
  return { content, frontmatter, toc, filePath };
}

export interface TOCItem {
  id: string;
  title: string;
  level: number;
}

function extractTOC(content: string): TOCItem[] {
  const slugger = new GithubSlugger();
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const items: TOCItem[] = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const rawTitle = match[2].trim();
    const title = rawTitle.replace(/`/g, '');
    const id = slugger.slug(title);
    items.push({
      id,
      title,
      level: match[1].length,
    });
  }
  return items;
}

function walkNav(items: NavItem[], fn: (item: NavItem) => void) {
  for (const item of items) {
    fn(item);
    if (item.children) {
      walkNav(item.children, fn);
    }
  }
}

export function getAllDocSlugs(): string[][] {
  const nav = getNav();
  const result: string[][] = [];
  walkNav(nav, (item) => {
    if (item.path) result.push(pathToSlug(item.path));
  });
  return result;
}

export function getFlatNav(): { title: string; slug: string[] }[] {
  const nav = getNav();
  const result: { title: string; slug: string[] }[] = [];
  walkNav(nav, (item) => {
    if (item.path)
      result.push({ title: item.title, slug: pathToSlug(item.path) });
  });
  return result;
}
