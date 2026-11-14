import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  latestPostLinks,
  liveSiteLinks,
  sameLinks,
} from '../../netlify/functions/nightly-rebuild.mjs';

test('rebuild only when Instagram has posts the live site doesn’t', async () => {
  const instagram = async () =>
    Response.json({ data: [{ permalink: 'p/3' }, { permalink: 'p/2' }, { permalink: 'p/1' }] });
  const site = (links) => async () => Response.json(links);

  const latest = await latestPostLinks('tok', instagram);
  assert.deepEqual(latest, ['p/3', 'p/2', 'p/1']);
  assert.equal(
    sameLinks(latest, await liveSiteLinks('https://x.test', site(['p/3', 'p/2', 'p/1']))),
    true,
  );
  assert.equal(
    sameLinks(latest, await liveSiteLinks('https://x.test', site(['p/2', 'p/1', 'p/0']))),
    false,
  );
  // A site built before this file existed: rebuild once.
  const missing = async () => new Response('Not found', { status: 404 });
  assert.deepEqual(await liveSiteLinks('https://x.test', missing), []);
});

test('an Instagram error is reported, not treated as "no posts"', async () => {
  const expired = async () =>
    Response.json({ error: { message: 'Session has expired' } }, { status: 400 });
  await assert.rejects(latestPostLinks('tok', expired), /expired/);
});
