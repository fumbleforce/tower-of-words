// How many pins each place shows on screen at a typical moment of the day, and which. One still per case.
//   node game3d/tools/pin-count.mjs [outdir]    (SIZES=1366x860,390x844 by default; BASE=.claude/worktrees/<name>/game3d)
// A case loads the place straight (?place=), skips its opening lines, sets the story flags of that moment, puts Eric
// where given and counts the pins drawn (shown, on screen and not crowded out by a nearer one). notes/interaction-audit.md
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';
import fs from 'node:fs';

const out = process.argv[2] || 'game3d/shots/pin-count';
fs.mkdirSync(out, { recursive: true });
const base = process.env.BASE || 'game3d';
const sizes = (process.env.SIZES || '1366x860,390x844').split(',').map((s) => s.split('x').map(Number));
const DAY = ['greeted_guard', 'guard_asked', 'jammed', 'gate_through_way', 'gate_through'];
const W1 = ['ohayo', 'matte', 'akete', 'sumimasen', 'yoroshiku']; // the words he knows by the office
const W2 = [...W1, 'ugoite', 'irete', 'tomatte']; // and after lunch
const OFFICE = [...DAY, 'greeted_mori', 'kenji_intro', 'greeted_kenji', 'found_chair', 'knocked', 'machine_open', 'chair_back'];
// place, Eric's spot, flags, the words he knows by then, period: the moment Jørgen flagged (office, "Go to the copy room with Mr. Mori.") first
const CASES = [
  { name: 'office-copyroom', place: 'office', at: [0.37, -1.55], mio: [0.75, -2.1], goal: 'Go to the copy room with Mr. Mori.', flags: [...OFFICE, 'got_ticket'], words: W1, period: 'morning' },
  { name: 'office-afternoon', place: 'office', at: [0.4, -1.0], mio: [-0.2, -2.1], flags: [...OFFICE, 'got_ticket', 'copier_done', 'ticket_closed', 'lunch_mio', 'afternoon_on'], words: W2, period: 'afternoon' },
  { name: 'train-seated', place: 'train', flags: ['seat_goal', 'sat', 'lesson_on', 'cat_task'], words: ['ohayo'] },
  { name: 'gate-jam', place: 'gate', flags: ['greeted_guard', 'guard_asked', 'jammed'], words: ['ohayo', 'matte'] },
  { name: 'forecourt-evening', place: 'forecourt', flags: [...OFFICE, 'going_home'], words: W2, period: 'evening' },
  { name: 'plaza-evening', place: 'plaza', flags: [...OFFICE, 'going_home'], words: W2, period: 'evening' },
];
const only = process.env.CASES ? process.env.CASES.split(',') : null;
const errors = [];
const rows = [];
await withBrowserJob(
  'pin-count',
  async (browser) => {
    for (const [w, h] of sizes) {
      const phone = w < 700;
      const context = await browser.newContext({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: phone });
      await context.addInitScript(() => {
        try {
          localStorage.setItem('amakawa-onboard', JSON.stringify({ moved: true, talked: true, uses: 9, sayUsed: true }));
        } catch {}
      });
      for (const c of CASES.filter((c) => !only || only.includes(c.name))) {
        const page = await context.newPage();
        page.setDefaultTimeout(90000);
        page.on('pageerror', (e) => errors.push(`${c.name}: ${e.message}`));
        await page.goto(`http://127.0.0.1:8771/${base}/index.html?q=1&skip&place=${c.place}`);
        await page.waitForFunction(() => window.__game?.player && window.__game.place && !document.body.classList.contains('at-title'));
        await page.waitForTimeout(2000);
        for (let i = 0; i < 40 && (await page.evaluate(() => !!window.__game.busy)); i++) {
          await page.keyboard.press('Space');
          await page.waitForTimeout(400);
        }
        await page.evaluate(
          async ({ c, base }) => {
            const { flags } = await import(`/${base}/js/narrative/state.js`);
            const { known } = await import(`/${base}/js/lang.js`);
            for (const f of c.flags) flags[f] = true;
            for (const w of c.words || []) known.add(w);
            if (c.period) flags.period = c.period;
            const G = window.__game;
            if (c.period) G.place.onPeriod?.(c.period);
            if (c.at) {
              G.player.root.position.x = c.at[0];
              G.player.root.position.z = c.at[1];
              G.walker.sync?.();
              G.place.cam?.release?.();
              G.place.cam?.snap?.(G.player.root.position);
            }
            if (c.mio) {
              G.mioNpc.root.visible = true;
              G.mioNpc.root.position.set(c.mio[0], 0, c.mio[1]);
            }
            if (c.goal) G.ui.goal(c.goal);
          },
          { c, base },
        );
        await page.waitForTimeout(1500);
        const pins = await page.evaluate(() =>
          window.__game.markers.list
            .filter((m) => m.el.style.display !== 'none' && m.el.offsetParent !== null && !m.el.classList.contains('crowded'))
            .filter((m) => {
              const r = m.el.querySelector('.pin').getBoundingClientRect();
              return r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
            })
            .map((m) => m.id),
        );
        const size = `${w}x${h}`;
        rows.push({ case: c.name, size, n: pins.length, pins });
        console.log(`${c.name} ${size}: ${pins.length} pins  ${pins.join(' ')}`);
        await page.screenshot({ path: `${out}/${c.name}-${size}.png` });
        await page.close();
      }
      await context.close();
    }
  },
);
fs.writeFileSync(`${out}/pins.json`, JSON.stringify(rows, null, 1));
if (errors.length) console.log('ERRORS', errors.join(' | '));
