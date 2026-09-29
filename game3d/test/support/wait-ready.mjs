// Report a script error immediately when startup fails, preserving the browser's actual error.
export async function waitForGame(page, timeout = 60000, navigate = async () => {}, mode = 'fast') {
  let rejectBoot;
  const bootError = new Promise((_, reject) => { rejectBoot = reject; });
  const onError = error => rejectBoot(new Error(`Game startup failed: ${error.message}`));
  const onResponse = response => {
    if (response.status() >= 400 && response.request().resourceType() === 'script') {
      onError(new Error(`Script HTTP ${response.status()}: ${response.url()}`));
    }
  };
  const onRequestFailed = request => {
    if (request.resourceType() === 'script') onError(new Error(`Script request failed: ${request.url()} (${request.failure()?.errorText})`));
  };
  page.on('pageerror', onError);
  page.on('response', onResponse);
  page.on('requestfailed', onRequestFailed);
  try {
    await Promise.race([(async () => {
      await navigate();
      await page.waitForFunction(mode => document.querySelector('.err') ||
        (window.__game?.place && window.__game?.walker &&
          (mode === 'fast' ? window.__test : mode === 'title' ? document.body.classList.contains('at-title') :
            mode === 'play' ? (!document.body.classList.contains('at-title') && !document.body.classList.contains('title-leaving')) : true)), mode, { timeout });
      const failure = await page.evaluate(() => document.querySelector('.err')?.textContent);
      if (failure) throw new Error(`Game startup failed: ${failure}`);
    })(), bootError]);
  } finally {
    page.off('pageerror', onError);
    page.off('response', onResponse);
    page.off('requestfailed', onRequestFailed);
  }
}
