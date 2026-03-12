import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { getNav, type NavItem } from './docs';

export interface SearchEntry {
  title: string;
  slug: string;
  description: string;
  content: string; // plain text for searching
  section: string; // parent section name
}

function stripMarkdown(md: string): string {
  return (
    md
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`[^`]+`/g, '')
      // Remove headings markers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
      // Remove links, keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove images
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      // Remove HTML tags
      .replace(/<[^>]+>/g, '')
      // Remove frontmatter markers
      .replace(/^---[\s\S]*?---/m, '')
      // Remove MkDocs tabs markers (=== "Tab Name"), including indented ones
      .replace(/^\s*={3}\s+"[^"]*"\s*$/gm, '')
      // Remove admonitions
      .replace(
        /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|DANGER)\]\s*$/gim,
        '',
      )
      .replace(/^>\s?/gm, '')
      // Collapse whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

function findSection(
  nav: NavItem[],
  filePath: string,
  section?: string,
): string {
  for (const item of nav) {
    const sectionTitle = section ?? item.title;
    if (item.path === filePath) return section ?? '';
    if (item.children) {
      const found = findSection(item.children, filePath, sectionTitle);
      if (found) return found;
    }
  }
  return '';
}

function collectEntries(
  items: NavItem[],
  nav: NavItem[],
  docsDir: string,
): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const item of items) {
    if (item.path) {
      const filePath = path.join(docsDir, item.path);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const { content, data } = matter(raw);
        const slug = item.path.replace(/\.md$/, '').replace(/\/index$/, '');
        entries.push({
          title: data.title || item.title,
          slug: `/docs/${slug}`,
          description: data.description || '',
          content: stripMarkdown(content).slice(0, 2000),
          section: findSection(nav, item.path),
        });
      }
    }
    if (item.children) {
      entries.push(...collectEntries(item.children, nav, docsDir));
    }
  }
  return entries;
}

export function buildSearchIndex(): SearchEntry[] {
  const docsDir = path.join(process.cwd(), 'docs');
  const nav = getNav();
  return collectEntries(nav, nav, docsDir);
}
