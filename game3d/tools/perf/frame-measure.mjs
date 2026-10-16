// Frame time on the real GPU, for the place budget check's frame tier (place-budget.mjs) and refresh-rate.mjs (#568,
// #625): a place or screen standing still for a few seconds, headless Chrome's 60 Hz unpinned (UNCAPPED), so a frame
// without a cap comes as fast as the GPU allows. The screens are the ones that aren't a place on their own: the title,
// B2 standing still, the pause menu over B2 and a fullscreen picture with a line under it (the CG layer's look).
// Public content only; the picture is a neutral generated one, as in game3d/tools/cg-performance.mjs.

// Chromium switches for the browser that measures (tools/lib/browser-job.mjs reads them from CHROME_ARGS).
export const UNCAPPED = '--disable-frame-rate-limit --disable-gpu-vsync';

// In the page: presented frames over `seconds`. A frame is a change of view.presentations seen by a
// requestAnimationFrame callback; worldDraws are the frames the 3D view really drew (a paused world holds its last).
// medianMs and p95Ms are the median and 95th percentile time between presented frames.
export function sampleFrameTimes(seconds) {
  const g = globalThis.__game, v = g.view, stamps = [];
  let seen = v.presentations, running = true;
  const tick = now => {
    if (!running) return;
    if (v.presentations !== seen) { seen = v.presentations; stamps.push(now); }
    globalThis.requestAnimationFrame(tick);
  };
  globalThis.requestAnimationFrame(tick);
  const draws = v.draws, start = globalThis.performance.now();
  return new Promise(done => setTimeout(done, seconds * 1000)).then(() => {
    running = false;
    const gaps = stamps.slice(1).map((t, i) => t - stamps[i]).sort((a, b) => a - b);
    const q = p => (gaps.length ? gaps[Math.min(gaps.length - 1, Math.floor(p * gaps.length))] : 0);
    const r2 = x => Math.round(x * 100) / 100;
    return {
      limit: v.activeCap(), fps: r2((stamps.length * 1000) / (globalThis.performance.now() - start)),
      medianMs: r2(q(0.5)), p95Ms: r2(q(0.95)), worldDraws: v.draws - draws, quality: v.quality,
      gpu: g.renderer.userData, place: g.place?.name,
    };
  });
}

const settled = page => page.waitForFunction(() => !globalThis.__game.place.perf?.busy?.(), null, { timeout: 30000 }).catch(() => {});

// B2, the player at the spot by the desks the refresh-rate numbers in notes/PERF.md were taken from
async function openOffice(page, index) {
  await page.goto(`${index}?place=office&mc=carina`);
  await page.waitForFunction(() => globalThis.__game?.place?.name === 'office' && globalThis.__done, null, { timeout: 90000 });
  await settled(page);
  await page.evaluate(() => {
    const g = globalThis.__game;
    g.player.root.position.set(4.96, 0, -1.2);
    g.place.cam?.snap?.(g.player.root.position);
  });
  await page.waitForTimeout(2000);
}

// a fullscreen picture (the private cg.js layer's look: blurred backdrop, slow push-in) with a line under it
function showPicture() {
  const d = globalThis.document, pic = d.createElement('canvas');
  pic.width = 1536; pic.height = 1024;
  const b = pic.getContext('2d'), grad = b.createLinearGradient(0, 0, 1536, 1024);
  grad.addColorStop(0, '#426174'); grad.addColorStop(1, '#15262f'); b.fillStyle = grad; b.fillRect(0, 0, 1536, 1024);
  for (let x = 0; x < 1536; x += 40) { b.fillStyle = x % 80 ? '#577c82' : '#324958'; b.fillRect(x, 120, 22, 800); }
  const src = pic.toDataURL(), cover = d.createElement('div');
  cover.style.cssText = 'position:fixed;inset:0;z-index:15;background:rgb(14,18,28);overflow:hidden';
  const bg = d.createElement('div');
  bg.style.cssText = `position:absolute;inset:-6%;background:center/cover url(${src});filter:blur(26px) brightness(.42) saturate(1.1)`;
  const img = d.createElement('img');
  img.src = src;
  img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;will-change:transform';
  cover.append(bg, img);
  img.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.065) translate(-.8%,.6%)' }], { duration: 18000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
  d.body.appendChild(cover);
  const css = d.createElement('style');
  css.textContent = 'body.cg-on #stage,body.cg-on #marks{visibility:hidden!important} body.cg-on #ui{z-index:16}';
  d.head.appendChild(css);
  globalThis.__game.busy = true;
  d.body.classList.add('cg-on');
  globalThis.__game.ui.typePrompt('sumimasen');
}

// Each screen: how it is reached from the one before (B2 is opened once for the three that stand in it).
// The names match `screens` in place-budgets.json.
export const SCREENS = {
  title: async (page, index) => {
    await page.goto(index);
    await page.waitForFunction(() => globalThis.__shellBooted && globalThis.__game?.view?.post && globalThis.document.body.classList.contains('at-title'), null, { timeout: 90000 });
    await page.waitForTimeout(2500);
  },
  'office-idle': async (page, index, state) => { if (!state.office) await openOffice(page, index); state.office = true; },
  pause: async (page, index, state) => {
    if (!state.office) await openOffice(page, index);
    state.office = true;
    await page.evaluate(() => globalThis.__shell.setPaused(true));
    await page.waitForTimeout(1000);
    return () => page.evaluate(() => globalThis.__shell.setPaused(false));
  },
  cg: async (page, index, state) => {
    if (!state.office) await openOffice(page, index);
    state.office = true;
    await page.evaluate(showPicture);
    await page.waitForTimeout(1500);
  },
};

// Measures the named screens in one page, in SCREENS order. index: the game page's URL. Returns { name: result }; a
// screen that fails gets { error }. shot(name) runs after each sample (refresh-rate.mjs takes a screenshot there).
export async function measureScreens(page, index, names, seconds, shot = async () => {}) {
  const out = {}, state = {};
  for (const name of Object.keys(SCREENS).filter(n => names.includes(n))) {
    try {
      const after = await SCREENS[name](page, index, state);
      out[name] = await page.evaluate(sampleFrameTimes, seconds);
      await shot(name);
      if (after) await after();
    } catch (error) {
      out[name] = { error: error.message.split('\n')[0] };
      if (name === 'title') continue;
      state.office = false;  // reopen B2 for the next one
    }
  }
  return out;
}
