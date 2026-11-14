// Page wording Cali edits at /admin/ → Pages (content/pages/*.json), as `pages.home`,
// `pages.about`, … Long fields are Markdown, rendered with the `md` filter.
// A function, so it's re-read on every build (the dev server rebuilds when content/ changes).
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../../content/pages/', import.meta.url);

export default function () {
  return Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => [f.replace(/\.json$/, ''), JSON.parse(readFileSync(new URL(f, dir), 'utf8'))]),
  );
}
