import assert from 'node:assert/strict';
import { scopedRoute } from '../../../tools/bible/check-scope.mjs';

export async function publicResearchContext(browser, viewport, errors) {
  return publicResearchContextOptions(browser, { viewport }, errors);
}

export async function publicResearchContextOptions(browser, options, errors = []) {
  const context = await browser.newContext(options);
  let closing = false;
  await context.route('**/*', scopedRoute({
    publicOnly: true,
    isClosing: () => closing,
    onFailure: message => errors.push(message),
  }));
  const close = context.close.bind(context);
  context.close = async (...args) => { closing = true; await close(...args); assert.deepEqual(errors, [], "Public Research requests"); };
  return context;
}

export async function settledResearchView(page) {
  await page.waitForFunction(() => !['at-title', 'title-cont', 'title-leaving', 'loading']
    .some(name => globalThis.document.body.classList.contains(name)));
  await page.locator('#title').waitFor({ state: 'hidden' });
  await page.locator('#boot').waitFor({ state: 'detached' });
}

export async function visibleResearchGoal(page, expected) {
  await settledResearchView(page);
  await page.locator('#goal .gl').waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const button = globalThis.document.querySelector('#goal .gl');
    if (!button?.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    for (let el = button; el; el = el.parentElement)
      if (Number(globalThis.getComputedStyle(el).opacity) < 0.99) return false;
    return true;
  }, null, { timeout: 5000 });
  const result = await page.evaluate(() => {
    const goal = globalThis.document.querySelector('#goal'), button = goal.querySelector('.gl');
    return {
      text: goal.querySelector('.t').textContent,
      visible: button.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }),
      rect: button.getBoundingClientRect().toJSON(),
      viewport: [globalThis.innerWidth, globalThis.innerHeight],
      classes: globalThis.document.body.className,
    };
  });
  assert.equal(result.text, expected);
  assert.equal(result.visible, true, 'saved objective is actually visible');
  assert.ok(result.rect.width > 0 && result.rect.height > 0);
  assert.ok(result.rect.x >= 0 && result.rect.right <= result.viewport[0]);
  assert.ok(result.rect.y >= 0 && result.rect.bottom <= result.viewport[1]);
  return result;
}
