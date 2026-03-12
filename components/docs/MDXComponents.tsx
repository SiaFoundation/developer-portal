import type { ReactNode } from 'react';
import { Callout } from './Callout';
import { CodeBlock } from './CodeBlock';
import { Mermaid } from './Mermaid';
import { Tab, Tabs } from './Tabs';

export const mdxComponents = {
  pre: ({
    children,
    ...props
  }: {
    children: ReactNode;
    [key: string]: any;
  }) => {
    return <CodeBlock {...props}>{children}</CodeBlock>;
  },
  blockquote: ({ children }: { children: ReactNode }) => {
    return (
      <blockquote className="border-l-4 border-[#2d2d2d] light:border-[#e0e0e0] pl-4 text-[#999] light:text-[#6b7280] italic">
        {children}
      </blockquote>
    );
  },
  a: ({ href, children }: { href?: string; children: ReactNode }) => {
    if (href?.endsWith('.md') || href?.includes('.md#')) {
      const converted = href.replace(/\.md(#|$)/, '$1').replace(/\/index$/, '');
      const fullHref = converted.startsWith('/')
        ? `/docs${converted}`
        : converted;
      return <a href={fullHref}>{children}</a>;
    }
    if (href?.startsWith('http')) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    }
    return <a href={href}>{children}</a>;
  },
  Callout,
  Tabs,
  Tab,
  Mermaid,
};
