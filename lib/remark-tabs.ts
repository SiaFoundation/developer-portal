/**
 * Pre-processes raw markdown to convert MkDocs `=== "Tab"` syntax
 * into MDX `<Tabs>` / `<Tab>` JSX before the markdown parser runs.
 * Supports nested tabs (e.g., language > platform).
 */
export function transformTabs(source: string): string {
  const lines = source.split('\n');
  return processLines(lines, 0).join('\n');
}

function processLines(lines: string[], indent: number): string[] {
  const result: string[] = [];
  let i = 0;
  const prefix = ' '.repeat(indent);
  const tabRe = new RegExp(`^${prefix}===\\s+"(.+)"\\s*$`);

  while (i < lines.length) {
    const match = lines[i].match(tabRe);
    if (!match) {
      result.push(lines[i]);
      i++;
      continue;
    }

    // Start of a tab group at this indent level
    const tabsIndex = result.length;
    result.push(''); // placeholder for <Tabs labels="...">
    const groupLabels: string[] = [];

    while (i < lines.length) {
      const tabMatch = lines[i].match(tabRe);
      if (!tabMatch) break;

      const label = tabMatch[1];
      groupLabels.push(label);
      result.push(`<Tab label="${label}">`);
      i++;

      // Collect content lines for this tab
      const contentLines: string[] = [];
      const contentIndent = indent + 4;
      const contentPrefix = ' '.repeat(contentIndent);

      while (i < lines.length) {
        // Next tab at same level — end this tab
        if (lines[i].match(tabRe)) break;
        // Non-empty line that doesn't have enough indentation — end of group
        if (lines[i].trim() !== '' && !lines[i].startsWith(contentPrefix))
          break;
        // Empty line — keep it
        if (lines[i].trim() === '') {
          contentLines.push('');
          i++;
          continue;
        }
        // Strip the content indent
        contentLines.push(lines[i].slice(contentIndent));
        i++;
      }

      // Trim trailing empty lines
      while (
        contentLines.length > 0 &&
        contentLines[contentLines.length - 1] === ''
      ) {
        contentLines.pop();
      }

      // Recursively process nested tabs in the content
      if (contentLines.length > 0) {
        const processed = processLines(contentLines, 0);
        result.push(...processed);
      }
      result.push('</Tab>');
    }

    result[tabsIndex] = `<Tabs labels="${groupLabels.join(',')}">`;
    result.push('</Tabs>');
    result.push('');
  }

  return result;
}
