// Shared by browser interception and HTTP probes; protected user sources are never QA inputs.
export function blockedSource(value, publicOnly = false) {
  let decoded = String(value);
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch { break; }
  }
  decoded = decoded.replaceAll('\\', '/');
  const url = new URL(decoded, 'http://127.0.0.1:8771/');
  const normalize = path => {
    const parts = [];
    for (const part of path.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') parts.pop(); else parts.push(part);
    }
    return '/' + parts.join('/');
  };
  return [url.pathname, url.hash.slice(1)].map(normalize).some(target =>
    /(?:^|\/)island\/private\/user(?:\/|$|[?#])/.test(target)
    || /(?:^|\/)manifest\.user\.json(?:$|[?#])/.test(target)
    || (publicOnly && /(?:^|\/)island\/private(?:\/|$|[?#])/.test(target)));
}

export async function scopedFetch(url, { publicOnly = false, method = 'GET', fetchImpl = fetch } = {}) {
  if (blockedSource(url, publicOnly)) throw new Error(`Out-of-scope source: ${url}`);
  return fetchImpl(url, { method, redirect: 'error', signal: AbortSignal.timeout(10000) });
}

// A few requests at a time, like a browser's own per-host limit: unbounded, one page that loads every review.json
// sent hundreds of route.fetch calls at once and stalled the server (#97). With `cache` (a Map), a GET that already
// answered 2xx in this run is served again from memory: the check visits ~100 routes that each reload every review
// and showcase file, and those don't change while it runs.
export function limiter(n) {
  let active = 0;
  const waiting = [];
  return async task => {
    if (active >= n) await new Promise(resolve => waiting.push(resolve));
    active++;
    try { return await task(); }
    finally { active--; waiting.shift()?.(); }
  };
}

export function scopedRoute({ publicOnly = false, onFailure, isClosing = () => false, limit = 8, cache = null }) {
  const slot = limiter(limit);
  return async route => {
    const url = route.request().url();
    try {
      if (blockedSource(url, publicOnly)) {
        onFailure(`blocked out-of-scope request: ${url}`);
        return await route.abort('blockedbyclient');
      }
      const method = route.request().method?.() || 'GET';
      const hit = cache && method === 'GET' && cache.get(url);
      if (hit) return await route.fulfill(await hit);
      // Playwright routes only the first hop. Do not fetch or fulfill redirects.
      const response = await slot(async () => {
        const r = await route.fetch({ maxRedirects: 0, timeout: 10000 });
        if (cache && method === 'GET' && r.status() >= 200 && r.status() < 300) {
          const body = await r.body();
          if (body.length <= 4 << 20) cache.set(url, Promise.resolve({ status: r.status(), headers: r.headers(), body }));
        }
        return r;
      });
      if (response.status() >= 300 && response.status() < 400) {
        onFailure(`redirect refused by Bible source scope: ${url}`);
        return await route.abort('blockedbyclient');
      }
      return await route.fulfill({ response });
    } catch (error) {
      if (isClosing() && /disposed|closed/i.test(error.message)) return;
      onFailure(`request failed ${url}: ${error.message.split('\n')[0]}`);
      try { return await route.abort('failed'); }
      catch (abortError) { if (!isClosing() || !/disposed|closed/i.test(abortError.message)) throw abortError; }
    }
  };
}
