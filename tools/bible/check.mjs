// Link checker for the world bible. Visits every route of the public and private bible in a headless
// browser, collects every link, image and audio source, and checks that each one resolves.
// Also fails if the public bible links to or shows anything in island/private/, if a live GUIDE quote can't be
// found any more, or if a page throws. Collapsed Legacy boxes are opened so their links are checked too.
//
//   node tools/bible/check.mjs            (needs the repo served on http://127.0.0.1:8771/)
//   BIBLE_BASE=http://127.0.0.1:8779/ node tools/bible/check.mjs    (a worktree served on another port)
//
// Showcase entries (showcase/<id>/entry.json) are checked too: each renders, every image path resolves and image
// ids are unique within the entry.
//
// --public-only checks the public site without accessing private sources.
import { withBrowserJob } from '../lib/browser-job.mjs';
import { blockedSource, scopedFetch, scopedRoute } from './check-scope.mjs';

const publicOnly = process.argv.includes('--public-only');

const BASE = process.env.BIBLE_BASE || 'http://127.0.0.1:8771/';
const SITES = [
  { name: 'public', path: 'bible/', data: 'bible/data.json' },
  { name: 'private', path: 'island/private/bible/', data: 'bible/data.json', priv: 'island/private/bible/private.json' },
].filter(site => !publicOnly || site.name === 'public');
const bad = [];
const checked = new Map();
const read = (url, method) => scopedFetch(url, { publicOnly, method });

async function head(u) {
  if (blockedSource(u, publicOnly)) return false;
  if (checked.has(u)) return checked.get(u);
  let ok;
  try {
    let r = await read(u, 'HEAD');
    if (r.status === 405 || r.status === 501) r = await read(u);
    ok = r.status < 400;
  } catch (e) { ok = false; }
  checked.set(u, ok);
  return ok;
}

const folderIds = async folder => [...(await (await read(BASE + folder + '/')).text()).matchAll(/href="([a-z0-9][a-z0-9-]*)\/"/g)].map(m => m[1]);
const showcaseIds = await folderIds('showcase').catch(() => []);

// every showcase entry: its images resolve and their ids are unique (the page and tools/review.py key feedback by id)
for (const id of showcaseIds) {
  let e;
  try { e = await (await read(BASE + `showcase/${id}/entry.json`)).json(); } catch (err) { bad.push(`showcase/${id}/entry.json: ${err.message}`); continue; }
  const images = [...(e.images || []), ...(e.sections || []).flatMap(sec => sec.images || [])];
  const seen = new Set();
  for (const im of images) {
    if (!im.id || seen.has(im.id)) bad.push(`showcase/${id}: image id ${im.id ? `"${im.id}" used twice` : 'missing'}`);
    seen.add(im.id);
    if (!im.image || !(await head(new URL(im.image, BASE).href))) bad.push(`showcase/${id}: image ${im.image} does not resolve`);
  }
  for (const k of ['title', 'date', 'by', 'caption']) if (!e[k]) bad.push(`showcase/${id}: no ${k}`);
}

// the story map's loader must read every story file (bible/story-graph.js, tools/bible/story-map-check.mjs)
{
  const { execFileSync } = await import('child_process');
  try { execFileSync(process.execPath, [new URL('story-map-check.mjs', import.meta.url).pathname, '--quiet'], { stdio: 'pipe' }); console.log('story map: every story file loads and parses'); }
  catch (e) { bad.push(`story map: ${String(e.stdout || e.message).trim().replace(/\s*\n\s*/g, ' | ')}`); }
}

try {
await withBrowserJob('bible-check', async browser => {
const context = await browser.newContext({ serviceWorkers: 'block' });
let closing = false;
let currentRoute = '';
await context.route('**/*', scopedRoute({ publicOnly, isClosing: () => closing,
  onFailure: message => bad.push(`${currentRoute}: ${message}`) }));
try {
for (const site of SITES) {
  const data = await (await read(BASE + site.data)).json();
  const routes = ['home', 'characters', 'places', 'story', 'words', 'rules', 'art', 'audio', 'reviews', 'questions', 'sources', 'story-map', 'story-map/office/office:ticket',
    ...data.characters.map(c => 'character/' + c.id),
    'search/mio', 'search/copier', 'story/lunch', 'doc/docs/game/cast.md', 'doc/docs/game/stories/mio-train.md', 'doc/notes/RELATIONSHIPS.md', 'doc/notes/mini-stories.md', 'src/GUIDE.md:42',
    ...data.story.legacy_docs.map(d => 'doc/' + d.path),
    'review', 'doc/reviews/README.md', 'showcase', 'doc/showcase/README.md',
    ...(await folderIds('reviews')).map(id => 'review/' + id), ...showcaseIds.map(id => 'showcase/' + id)];
  if (site.priv) routes.push('rewards');
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const refs = new Map();
  for (const r of new Set(routes)) {
    currentRoute = `${site.name} #${r}`;
    if (blockedSource(BASE + site.path + '#' + r, publicOnly)) {
      bad.push(`${site.name}: out-of-scope route`);
      continue;
    }
    await page.evaluate(() => { if (document.body) document.body.dataset.ready = '0'; });
    await page.goto(BASE + site.path + '#' + r);
    await page.waitForFunction(() => document.body.dataset.ready === '1' && !document.querySelector('#main').textContent.includes('Loading'), null, { timeout: 20000 });
    await page.waitForTimeout(150);
    // open every collapsed Legacy box so its links are checked too
    await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
    const found = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('a[href]').forEach(a => out.push(['a', a.getAttribute('href'), a.href]));
      document.querySelectorAll('img').forEach(i => out.push(['img', i.getAttribute('src'), i.src]));
      document.querySelectorAll('[data-lb]').forEach(i => out.push(['lb', i.dataset.lb, new URL(i.dataset.lb, location.href).href]));
      document.querySelectorAll('audio[src]').forEach(a => out.push(['audio', a.getAttribute('src'), a.src]));
      const missingQuotes = [...document.querySelectorAll('.missing-q')].map(e => e.textContent);
      return { out, text: document.querySelector('#main').innerText, missingQuotes };
    });
    if (/^Not found/m.test(found.text)) bad.push(`${site.name} #${r}: page says Not found`);
    for (const q of found.missingQuotes) bad.push(`${site.name} #${r}: ${q}`);
    if (/Some live sources didn't load/.test(found.text)) bad.push(`${site.name} #${r}: ${found.text.match(/Some live sources didn't load:[^]*?(?=\n\n|Sections)/)[0].replace(/\s+/g, ' ')}`);
    for (const [kind, raw, abs] of found.out) {
      if (abs && !refs.has(abs)) refs.set(abs, { kind, raw, from: r });
    }
  }
  for (const [abs, { kind, raw, from }] of refs) {
    if (blockedSource(abs, site.name === 'public')) {
      bad.push(`${site.name} out-of-scope link: ${raw} (on #${from})`);
      continue;
    }
    const u = new URL(abs);
    if (u.hash && u.origin + u.pathname === BASE + site.path) {
      const h = decodeURIComponent(u.hash.slice(1));
      const [head_, ...rest] = h.split('/');
      const arg = rest.join('/');
      if (head_ === 'character' && !data.characters.some(c => c.id === arg)) bad.push(`${site.name}: unknown character ${h} (on #${from})`);
      if (head_ === 'src' || head_ === 'doc') {
        const p = arg.replace(/:\d+$/, '');
        if (!p.endsWith('/') && !(await head(new URL(p, BASE).href))) bad.push(`${site.name}: source missing ${p} (on #${from})`);
      }
      continue;
    }
    if (u.origin === 'http://127.0.0.1:8772') continue; // the dashboard runs only while he uses it
    if (!u.protocol.startsWith('http')) continue;
    if (u.origin !== new URL(BASE).origin) continue;
    if (!(await head(u.origin + u.pathname))) bad.push(`${site.name}: ${kind} ${raw} does not resolve (on #${from})`);
  }
  if (errors.length) bad.push(...errors.map(e => `${site.name}: script error ${e}`));
  console.log(`${site.name}: ${routes.length} routes, ${refs.size} distinct links, images and audio checked`);
}
} finally {
  closing = true;
  await context.close();
}
});
} catch (error) {
  if (error.code === 'LOAD_DEFERRED' && !bad.length) {
    console.log(`DEFERRED bible: ${error.message}`);
    process.exit(75);
  }
  bad.push(error.message);
}
if (bad.length) { console.log(`\n${bad.length} problems:`); bad.forEach(b => console.log(' - ' + b)); process.exit(1); }
console.log('all links resolve');
