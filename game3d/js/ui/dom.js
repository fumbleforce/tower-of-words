export const $ = (s, r = document) => r.querySelector(s);
// buttons are plain buttons (never form submits)
export const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (tag === 'button') e.type = 'button';
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
