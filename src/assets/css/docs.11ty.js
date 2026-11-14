// Styles for the internal /design-system/ pages only, in the patterns layer.
import { readFile } from 'node:fs/promises';

export const data = { permalink: '/assets/css/docs.css', eleventyExcludeFromCollections: true };

export async function render() {
  return `@layer patterns {\n${await readFile('src/design-system/docs.css', 'utf8')}\n}\n`;
}
