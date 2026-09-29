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

export function scopedRoute({ publicOnly = false, onFailure, isClosing = () => false }) {
  return async route => {
    const url = route.request().url();
    try {
      if (blockedSource(url, publicOnly)) {
        onFailure(`blocked out-of-scope request: ${url}`);
        return await route.abort('blockedbyclient');
      }
      // Playwright routes only the first hop. Do not fetch or fulfill redirects.
      const response = await route.fetch({ maxRedirects: 0, timeout: 10000 });
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
