// Quick save, quick load, a save into slot 5 with its picture, the saves screen fitting the screen, and the People
// panel's hearts, in the real game (docs/game/controls-and-ui.md, Saves; People). Starts day 2 (?day=2, everyone met
// on day 1), quick saves (F5 on desktop, the HUD button on the phone), makes progress, quick loads (F9 / the pause
// menu), answers the confirm, and checks the reload comes back to the same place, goal and money. Then saves into
// slot 5 from the pause menu, checks its thumbnail, the replace confirm and the Load tab, and opens People.
//   node game3d/tools/saves-check.mjs [w] [h]     writes game3d/shots/saves-check/<w>x<h>/, prints PASS or FAIL
import fs from 'node:fs';
import path from 'node:path';
import { withBrowserJob } from '../../tools/lib/browser-job.mjs';

const [W = '1366', H = '860'] = process.argv.slice(2);
const G = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const repo = G.replace(/\/\.claude\/worktrees\/[^/]+\/game3d$/, '/game3d').replace(/\/game3d$/, '');
const base = `http://127.0.0.1:8771/${path.relative(repo, G)}`;
const out = path.join(G, `shots/saves-check/${W}x${H}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const phone = +W < 700;
const fails = [];
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) fails.push(what);
};

await withBrowserJob('saves-check', async (b) => {
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, isMobile: phone, hasTouch: phone });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('saves-check-seeded')) return;
    localStorage.clear();
    localStorage.setItem('amakawa-settings', JSON.stringify({ textSpeed: 'instant', voiceOn: false, reduceMotion: true }));
    sessionStorage.setItem('saves-check-seeded', '1');
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  const shot = (n) => p.screenshot({ path: path.join(out, n + '.png') });
  // free to act: the place is in, nothing scripted, no line up (lines move on with Space, or a tap on the phone) and
  // no ticket app open (day 2 opens it on Mio's station request; Close shuts it and the story goes on)
  const look = () =>
    p.evaluate(() => {
      const g = window.__game;
      return {
        ready: !!g?.place && g.saveEnabled && !document.body.classList.contains('at-title'),
        busy: !!g?.busy || !!g?.player?.scripted,
        talking: !!g?.ui?.talking,
        line: (document.querySelector('#talk')?.hidden ? '' : document.querySelector('#talk .line')?.textContent || '').trim(),
        choice: !!document.querySelector('#talk .chips button'),
        tickets: !!document.querySelector('#ticketsApp:not([hidden])'),
      };
    });
  const advance = async () => {
    const s = await look();
    if (s.tickets) await p.locator('#ticketsApp .tk-close').click();
    else if (s.choice) await p.locator('#talk .chips button').first().click();
    else if (s.talking) {
      if (phone) {
        const r = await p.locator('#talk').boundingBox();
        if (r) await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
      } else await p.keyboard.press('Space');
    }
  };
  const settle = async () => {
    for (let i = 0; i < 120; i++) {
      const s = await look();
      if (s.ready && !s.busy && !s.talking) return true;
      await advance();
      await p.waitForTimeout(250);
    }
    return false;
  };
  const resumed = async () => {
    await p.waitForFunction(() => window.__game?.place && document.querySelector('#title')?.hidden, null, { timeout: 120000 });
    await p.waitForFunction(() => window.__game?.saveEnabled, null, { timeout: 60000 }).catch(() => {});
  };
  const state = () =>
    p.evaluate(async () => {
      const S = await import(new URL('js/sim.js', location.href).href);
      const { flags } = await import(new URL('js/narrative/state.js', location.href).href);
      const g = window.__game;
      return { place: g.place.name, goal: g.ui.goalText || '', yen: S.sim.yen, period: S.sim.period, qa: !!flags.qa_after_quick };
    });
  const quickSave = async () => {
    if (phone) await p.locator('#qsaveBtn').tap();
    else await p.keyboard.press('F5');
    await p
      .waitForFunction(() => /Quick saved/.test(document.querySelector('#toast')?.textContent || ''), null, { timeout: 8000 })
      .catch(() => {});
    return (await p.locator('#toast').textContent()) || '';
  };
  const quickLoad = async () => {
    if (phone) {
      await p.locator('#pauseBtn').tap();
      await p.locator('#pause .qload').tap();
    } else await p.keyboard.press('F9');
  };

  await p.goto(`${base}/index.html?day=2`);
  await p.waitForFunction(() => window.__game?.place, null, { timeout: 120000 });
  await p.waitForFunction(() => window.__game?.ui?.talking, null, { timeout: 30000 }).catch(() => {});

  // A. in the middle of a conversation: the save restores that conversation from its first line
  const mid = await look();
  if (mid.talking) {
    const first = mid.line;
    // on to a later line, so the load has something to rewind (a line can ignore input for a moment as it comes in)
    for (let i = 0; i < 12 && (await look()).line === first; i++) {
      await advance();
      await p.waitForTimeout(250);
    }
    const at = (await look()).line;
    check(at && at !== first, 'the conversation moved past its first line before the quick save');
    const toast = await quickSave();
    check(/Quick saved/.test(toast) && /conversation again from the beginning/.test(toast), `mid-conversation quick save says what loading does ("${toast}")`);
    await shot('1-quick-saved-mid-talk');
    const nav = p.waitForEvent('domcontentloaded', { timeout: 20000 });
    await quickLoad();
    await nav;
    await resumed();
    await p.waitForFunction(() => window.__game?.ui?.talking, null, { timeout: 30000 }).catch(() => {});
    const back = await look();
    console.log(`     saved at "${at}"; first line "${first}"; back at "${back.line}"`);
    check(back.talking && back.line === first, 'quick load with nothing new loads at once and replays the conversation from its first line');
    await shot('2-quick-loaded-mid-talk');
  } else console.log('     (no conversation at the start of day 2: mid-conversation part skipped)');

  // B. free to act: same place, goal and money after the load
  check(await settle(), 'the player is free to act');
  const before = await state();
  console.log('     at', JSON.stringify(before));
  check(/Quick saved/.test(await quickSave()), 'the "Quick saved" notice shows');
  check(await p.evaluate(() => !!localStorage.getItem('amakawa-slot-quick')), 'the quick slot is written');
  await shot('3-quick-saved');
  // progress after it: money spent, a story flag and a new goal the load must undo
  await p.evaluate(async () => {
    const S = await import(new URL('js/sim.js', location.href).href);
    const { flags } = await import(new URL('js/narrative/state.js', location.href).href);
    S.sim.yen -= 120;
    flags.qa_after_quick = true;
    window.__game.ui.goal('A goal set after the quick save.');
    S.save(window.__game);
  });
  await quickLoad();
  await p.waitForSelector('#ask:not([hidden]) .yes', { timeout: 8000 }).catch(() => {});
  check(await p.locator('#ask .yes').isVisible(), 'quick load asks first when there is unsaved progress');
  await p.waitForTimeout(250);
  await shot('4-quick-load-confirm');
  const nav = p.waitForEvent('domcontentloaded', { timeout: 20000 });
  await p.locator('#ask .yes').click();
  await nav;
  await resumed();
  check(await settle(), 'the quick save resumes');
  const after = await state();
  console.log('     back at', JSON.stringify(after));
  check(after.place === before.place, `same place (${after.place})`);
  check(after.period === before.period, `same period (${after.period})`);
  check(after.goal === before.goal, `same goal ("${after.goal}")`);
  check(after.yen === before.yen, `money as it was (¥${after.yen})`);
  check(!after.qa, 'progress after the quick save is gone');
  await shot('5-quick-loaded');

  // 4. save into slot 5 from the pause menu
  if (phone) await p.locator('#pauseBtn').tap();
  else await p.keyboard.press('Escape');
  await p.waitForSelector('#pause:not([hidden]) .qsave');
  await p.waitForTimeout(300);
  await shot('5b-pause');
  await p.locator('#pause .save').click();
  await p.waitForSelector('#saves:not([hidden]) .slot[data-id="5"]');
  await p.locator('#saves .slot[data-id="5"]').click();
  await p.waitForFunction(() => /Saved to Slot 5/.test(document.querySelector('#saves .note')?.textContent || ''), null, {
    timeout: 10000,
  }).catch(() => {});
  check(/Saved to Slot 5/.test(await p.locator('#saves .note').textContent()), 'slot 5 saved');
  await p.waitForFunction(() => document.querySelector('#saves .slot[data-id="5"] .thumb img')?.naturalWidth > 0, null, {
    timeout: 8000,
  }).catch(() => {});
  const thumb = await p.evaluate(() => {
    const img = document.querySelector('#saves .slot[data-id="5"] .thumb img');
    return img ? { w: img.naturalWidth, h: img.naturalHeight, len: img.src.length } : null;
  });
  check(!!thumb && thumb.w > 100, `slot 5 shows its thumbnail (${thumb ? `${thumb.w}x${thumb.h}, ${Math.round(thumb.len / 1024)} kB` : 'none'})`);
  const card = await p.locator('#saves .slot[data-id="5"]').textContent();
  check(card.includes('Day 2') && card.includes('Slot 5'), `slot 5 names the day and period: "${card.replace(/\s+/g, ' ').trim()}"`);
  const fit = await p.evaluate(() => {
    const r = document.querySelector('#saves .pane').getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, vw: innerWidth, vh: innerHeight };
  });
  check(fit.top >= -1 && fit.left >= -1 && fit.bottom <= fit.vh + 1 && fit.right <= fit.vw + 1, `the saves screen fits (${JSON.stringify(fit)})`);
  await shot('6-saved-slot5');
  if (!phone) {
    await p.locator('#saves .slot[data-id="5"]').focus();
    await p.keyboard.press('ArrowRight');
    check(await p.evaluate(() => document.activeElement?.dataset?.id === '6'), 'arrow keys move to the next card');
    await p.keyboard.press('ArrowLeft');
  }
  // the replace confirm
  await p.locator('#saves .slot[data-id="5"]').click();
  await p.waitForSelector('#ask:not([hidden]) .yes', { timeout: 5000 }).catch(() => {});
  check(/Replace Slot 5/.test((await p.locator('#ask h2').textContent().catch(() => '')) || ''), 'saving over slot 5 asks first');
  await p.waitForTimeout(200);
  await shot('7-replace-confirm');
  await p.locator('#ask .no').click();
  await p.waitForTimeout(250);
  // the Load tab
  await p.locator('#saves .modes [data-mode="load"]').click();
  await p.waitForTimeout(500);
  const loadIds = await p.evaluate(() => [...document.querySelectorAll('#saves .slot')].map((s) => s.dataset.id));
  check(['quick', 'auto', '5'].every((id) => loadIds.includes(id)), `Load lists quick, auto and slot 5 (${loadIds.join(',')})`);
  await shot('8-load-tab');
  await p.locator('#saves .x').click();
  await p.waitForTimeout(250);
  if (phone) await p.locator('#pause .resume').tap();
  else await p.keyboard.press('Escape');
  await p.waitForTimeout(300);

  // 5. People with hearts
  await p.locator('#peopleBtn').click();
  await p.waitForSelector('#peoplePanel:not([hidden]) li');
  const ppl = await p.evaluate(() =>
    [...document.querySelectorAll('#peoplePanel li')].map((li) => ({
      id: li.dataset.id,
      step: +li.dataset.step,
      on: li.querySelectorAll('.bd svg.on').length,
      all: li.querySelectorAll('.bd svg').length,
      stand: li.querySelector('.stand')?.textContent,
    })),
  );
  console.log('     people', JSON.stringify(ppl));
  check(ppl.length > 0 && ppl.every((x) => x.all === 5 && x.on === x.step && x.stand), 'every met person has five hearts, filled to their step, and a line');
  await shot('9-people');
  // the HUD with every chip up (Bag and Photos come later in the day) stays on screen with the quick save button
  await p.evaluate(() => {
    document.querySelector('#peoplePanel .close')?.click();
    for (const id of ['#bagBtn', '#photosBtn']) if (document.querySelector(id)) document.querySelector(id).hidden = false;
  });
  await p.waitForTimeout(300);
  const off = await p.evaluate(() =>
    [...document.querySelectorAll('#hud > :not([hidden])')]
      .map((e) => [e.id, e.getBoundingClientRect()])
      .filter(([, r]) => r.width && (r.left < 0 || r.right > innerWidth))
      .map(([id]) => id),
  );
  check(!off.length, `every HUD chip is on screen with the HUD full${off.length ? ': off ' + off.join(',') : ''}`);
  await shot('10-hud-full');
  // the public build has no feedback button: there the full HUD is one row on desktop; the phone's wraps to two since
  // Menu and Quick save carry their names (#345). Chips of different heights (the clock) share a row when they overlap.
  await p.evaluate(() => document.querySelector('#feedbackBtn')?.setAttribute('hidden', ''));
  await p.waitForTimeout(200);
  const rows = await p.evaluate(() => {
    const rs = [...document.querySelectorAll('#hud > :not([hidden])')].map((e) => e.getBoundingClientRect()).filter((r) => r.width);
    let n = 0;
    let bottom = -Infinity;
    for (const r of rs.sort((a, b) => a.top - b.top)) {
      if (r.top >= bottom - 1) {
        n++;
        bottom = r.bottom;
      } else bottom = Math.max(bottom, r.bottom);
    }
    return n;
  });
  const most = phone ? 2 : 1;
  check(rows <= most, `without the local feedback button the full HUD is at most ${most} row${most > 1 ? 's' : ''} (${rows})`);
  await shot('11-hud-full-public');
  check(!errs.length, `no page errors${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
  await ctx.close();
});
console.log(`${fails.length ? 'FAIL' : 'PASS'} saves-check ${W}x${H} (${out})`);
process.exit(fails.length ? 1 : 0);
