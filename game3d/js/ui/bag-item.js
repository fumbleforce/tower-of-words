const esc = (text) =>
  String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export function bagItemHTML(id, item) {
  const read = item?.document ? `<button type="button" data-read-item="${esc(id)}">Read</button>` : '';
  return `<li>${esc(item?.name || id)}${read}</li>`;
}
