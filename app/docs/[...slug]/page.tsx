import { h } from 'hastscript';
import type { Metadata } from 'next';
import { compileMDX } from 'next-mdx-remote/rsc';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { mdxComponents } from '@/components/docs/MDXComponents';
import { NextPrevLinks } from '@/components/docs/NextPrevLinks';
import { TableOfContents } from '@/components/docs/TableOfContents';
import { getAllDocSlugs, getDocBySlug, getFlatNav } from '@/lib/docs';
import { transformTabs } from '@/lib/remark-tabs';
import { transformAlerts } from '@/lib/transform-alerts';
import { transformMermaid } from '@/lib/transform-mermaid';

const LINK_ICON = h(
  'svg',
  {
    className: 'heading-anchor-icon',
    width: '0.75em',
    height: '0.75em',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: 'display:inline;vertical-align:middle',
  },
  [
    h('path', {
      d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
    }),
    h('path', {
      d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    }),
  ],
);

export async function generateStaticParams() {
  return getAllDocSlugs().map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { frontmatter } = getDocBySlug(slug);
  const title = `${frontmatter.title || slug[slug.length - 1]} - Sia Developer Docs`;
  const description =
    frontmatter.description || 'Sia developer documentation and guides.';
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const { content, toc } = getDocBySlug(slug);

  const source = transformMermaid(transformAlerts(transformTabs(content)));

  const { content: mdxContent } = await compileMDX({
    source,
    components: mdxComponents,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: 'append',
              properties: {
                className: ['heading-anchor'],
                ariaHidden: true,
                tabIndex: -1,
              },
              content: LINK_ICON,
            },
          ],
          [
            rehypePrettyCode,
            {
              theme: {
                dark: 'github-dark',
                light: 'github-light',
              },
              keepBackground: false,
            },
          ],
        ],
      },
    },
  });

  const flatNav = getFlatNav();
  const currentIndex = flatNav.findIndex(
    (item) => item.slug.join('/') === slug.join('/'),
  );
  const prev = currentIndex > 0 ? flatNav[currentIndex - 1] : null;
  const next =
    currentIndex < flatNav.length - 1 ? flatNav[currentIndex + 1] : null;

  return (
    <div className="flex justify-center flex-1 min-w-0">
      <article className="w-full max-w-3xl px-4 md:px-8 py-10 overflow-x-hidden">
        <div className="prose prose-sm max-w-none">
          {mdxContent}
        </div>
        <NextPrevLinks prev={prev} next={next} />
      </article>
      <TableOfContents items={toc} />
    </div>
  );
}
