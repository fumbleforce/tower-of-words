const { document, fetch } = globalThis;
export const $ = (s, root = document) => root.querySelector(s);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function api(action, body) {
  const r = await fetch('/api/subplots/' + action, body === undefined ? {} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data = await r.json();
  if (!r.ok || data.error) throw Error(data.error || `Request failed (${r.status})`);
  return data;
}
export function notice(text, error = false) { const el=$('#notice');el.textContent=text;el.hidden=!text;el.dataset.error=error; }
export function guarded(fn) { return async (...args) => {try {await fn(...args);} catch(e){notice(e.message,true);} }; }
export const clone = o => JSON.parse(JSON.stringify(o));
