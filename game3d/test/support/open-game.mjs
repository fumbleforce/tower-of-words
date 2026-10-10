// Scenario setup only. Callers own their route actions, assertions and capture policy.
import { waitForGame } from './wait-ready.mjs';

export async function openGame(browser, {
  viewport = { width: 1366, height: 860 }, mode = 'play', initialOnboarding, route,
  quality = 0, url, touch = false, timeoutMs = 60000, beforeNavigate,
} = {}) {
  if (!['play', 'title', 'fast'].includes(mode)) throw new Error(`Unknown startup mode: ${mode}`);
  const context = await browser.newContext({ viewport, isMobile: touch, hasTouch: touch });
  const errors = [];
  try {
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && !/^Failed to load resource:.*404/.test(message.text())) errors.push(message.text());
    });
    // Preload saved history only. Clicking Start intentionally resets it in the real game.
    if (initialOnboarding !== undefined) await page.addInitScript(value => {
      localStorage.setItem('amakawa-onboard', JSON.stringify(value));
    }, initialOnboarding);
    if (beforeNavigate) await beforeNavigate(page, context);
    const target = new URL(url || `http://127.0.0.1:${process.env.PORT || 8771}/game3d/index.html`);
    if (!url) {
      target.searchParams.set('q', String(quality));
      if (mode === 'fast') target.searchParams.set('test', 'fast');
      if (route) target.searchParams.set('route', route);
    }
    await waitForGame(page, timeoutMs, async () => {
      const response = await page.goto(target.href, { timeout: Math.min(timeoutMs, 30000) });
      if (!response?.ok()) throw new Error(`Game HTTP ${response?.status()}: ${target.href}`);
    }, mode === 'fast' ? 'fast' : 'title');
    if (mode === 'play') {
      if (touch) await page.locator('#title .go').tap();
      else await page.locator('#title .go').click();
      await waitForGame(page, timeoutMs, async () => {}, 'play');
    }
    const waitForSettled = () => page.waitForFunction(() =>
      window.__game?.place && !window.__game.busy && !window.__game.walker?.path &&
      !document.body.classList.contains('at-title') && !document.body.classList.contains('title-leaving'),
    null, { timeout: timeoutMs });
    return { page, context, errors, waitForSettled, close: () => context.close() };
  } catch (error) {
    try { await context.close(); } catch (closeError) { errors.push(`Context cleanup failed: ${closeError.message}`); }
    throw new Error([...new Set([error.message, ...errors])].join(' | '), { cause: error });
  }
}
