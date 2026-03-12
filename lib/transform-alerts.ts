/**
 * String-level preprocessor that converts GitHub-style blockquote alerts
 * into <Callout> JSX before MDX compilation.
 *
 * Input:
 *   > [!DANGER]
 *   > **Bold text** and more.
 *
 * Output:
 *   <Callout type="danger">
 *
 *   **Bold text** and more.
 *
 *   </Callout>
 */
const ALERT_RE = /^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|DANGER)\]\s*$/i;

export function transformAlerts(source: string): string {
  const lines = source.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const match = lines[i].match(ALERT_RE);
    if (match) {
      const type = match[1].toLowerCase();
      const contentLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].startsWith('>')) {
        contentLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      result.push(`<Callout type="${type}">`);
      result.push('');
      result.push(...contentLines);
      result.push('');
      result.push('</Callout>');
    } else {
      result.push(lines[i]);
      i++;
    }
  }

  return result.join('\n');
}
