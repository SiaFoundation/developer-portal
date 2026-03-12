/**
 * Converts mermaid code blocks into Mermaid JSX components
 * so they bypass rehype-pretty-code and render as diagrams.
 * Base64-encodes the chart to avoid MDX prop-parsing issues.
 */
export function transformMermaid(source: string): string {
  return source.replace(
    /```mermaid\n([\s\S]*?)```/g,
    (_match, chart: string) => {
      const encoded = Buffer.from(chart.trimEnd()).toString('base64');
      return `<Mermaid encoded="${encoded}" />`;
    },
  );
}
