// The one top menu for the local tool pages (notes/tools/README.md lists them). A page includes it with one line:
//   <script src="<path to the repo root>tools/nav/nav.js"></script>
// (the image gen dashboard on port 8772 uses http://127.0.0.1:8771/tools/nav/nav.js). Links are built from this
// script's own URL, so the menu works from the main checkout, a worktree and the other port alike.
//
// The bar is fixed at the top. It sets --anav-h on <html> and pads <body> by that much; a page with its own sticky
// or full-height parts offsets them with var(--anav-h, 0px).
//
// Private mode (Jørgen, 2026-10-10: "the /private route would open the private version of the hole nav, it would get
// the additional tools and capabilities, like an extention of the original. be DRY, don't remake it, make sure every
// tool and item has one place they are defined"). http://127.0.0.1:8771/private turns it on for this browser (a cookie,
// so the image gen port sees it too) and /public turns it off (tools/review_server.py). It is the same site: in private
// mode /api/nav-private.js hands out the one private registry file, which calls AmakawaNav.addPrivate({ items,
// capabilities }) to add bar entries after these and to give tools their private extras (a tool asks with
// await AmakawaNav.ready, then AmakawaNav.capability('<tool id>')). Outside private mode, or without the private files,
// that script is empty and nothing private shows. This file never names private content; ITEMS below is the only
// place a public tool is defined, and tools/check/nav-registry.mjs fails on a second definition.
// The bar only appears on this machine (127.0.0.1 or localhost), never on the public site, and not in automated
// browsers (screenshots and checks of these pages stay as they were) unless the test sets window.AMAKAWA_NAV = true.
(() => {
  if (window.AmakawaNav) return;
  const local = /^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname);
  const showBar = local && (!navigator.webdriver || window.AMAKAWA_NAV === true);
  const src = document.currentScript?.src || new URL('/tools/nav/nav.js', 'http://127.0.0.1:8771/').href;
  const root = new URL('../../', src); // the repo root this page belongs to (main checkout or a worktree)
  const origin = new URL(src).origin;
  const R = root.pathname;
  const privateMode = local && /(?:^|;\s*)amakawa_mode=private(?:;|$)/.test(document.cookie);
  const here = () => ({ p: location.pathname, h: location.hash, port: location.port, o: location.origin });
  const on = (path) => ({ p, o }) => o === origin && (p === R + path || p === R + path + 'index.html');

  // One list: the bar, in this order. The bible comes first and is where the root address goes (Jørgen, 2026-10-10:
  // "if we have a unified nav, we should be starting with the bible, and have the various tools as nav items, including the game").
  const ITEMS = [
    { id: 'bible', label: 'Bible', href: 'bible/', match: (l) => on('bible/')(l) && !/^#(review|showcase)/.test(l.h) },
    { id: 'review', label: 'Review', href: 'bible/#review', match: (l) => on('bible/')(l) && /^#review/.test(l.h) },
    { id: 'showcase', label: 'Showcase', href: 'bible/#showcase', match: (l) => on('bible/')(l) && /^#showcase/.test(l.h) },
    { id: 'editor', label: 'Scene editor', href: 'tools/subplots/web/', match: on('tools/subplots/web/') },
    { id: 'imagegen', label: 'Image gen', href: 'http://127.0.0.1:8772/', match: (l) => l.port === '8772' },
    { id: 'assets', label: 'Assets', href: 'tools/assets/', match: on('tools/assets/') },
    { id: 'characters', label: 'Characters', href: 'game3d/viewer.html', match: on('game3d/viewer.html') },
    { id: 'notes', label: 'Notes', href: 'hub/notes.html', match: on('hub/notes.html') },
    { id: 'game', label: 'Game', href: 'game3d/', target: 'amakawa-game', match: () => false, external: true },
  ];
  let privateItems = [];
  let capabilities = {};
  let settle;
  const ready = new Promise((res) => { settle = res; });

  const url = (href) => /^https?:/.test(href) ? href : href.startsWith('/') ? origin + href : new URL(href, root).href;

  const css = `
html.has-anav{--anav-h:40px;scroll-padding-top:var(--anav-h)}
html.has-anav body{padding-top:var(--anav-h)}
#amakawa-nav{position:fixed;top:0;left:0;right:0;z-index:19;height:40px;box-sizing:border-box;display:flex;align-items:center;gap:2px;
 margin:0;padding:0 10px;background:#0f1217;border:0;border-bottom:1px solid rgba(255,255,255,.08);overflow-x:auto;overflow-y:hidden;
 scrollbar-width:none;white-space:nowrap;font:500 13px/1 Geist,"Zen Kaku Gothic New",system-ui,-apple-system,"Segoe UI",sans-serif;
 -webkit-font-smoothing:antialiased;color-scheme:dark}
#amakawa-nav::-webkit-scrollbar{display:none}
#amakawa-nav a{flex:none;display:inline-flex;align-items:center;height:28px;padding:0 10px;border-radius:6px;color:#a3abb9;
 text-decoration:none;background:none;border:0;font:inherit;letter-spacing:0}
#amakawa-nav a:hover{color:#e7eaf0;background:rgba(255,255,255,.05)}
#amakawa-nav a:focus-visible{outline:2px solid #6fd0c6;outline-offset:-2px}
#amakawa-nav a[aria-current=page]{color:#6fd0c6;background:rgba(111,208,198,.14);font-weight:650}
#amakawa-nav .anav-sep{flex:none;width:1px;height:18px;margin:0 6px;background:rgba(255,255,255,.1)}
#amakawa-nav .anav-ext{margin-left:4px;font-size:11px;opacity:.7}
#amakawa-nav .anav-group{flex:none;display:inline-flex;align-items:center;gap:2px}
#amakawa-nav .anav-tag{flex:none;margin:0 4px 0 2px;padding:0 7px;height:18px;display:inline-flex;align-items:center;border-radius:999px;
 background:rgba(236,147,173,.14);color:#ec93ad;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
#amakawa-nav .anav-private a[aria-current=page]{color:#ec93ad;background:rgba(236,147,173,.14)}
#amakawa-nav .anav-private a[data-anav=leave-private]{color:#727b8b;font-size:12px}
@media (max-width:700px){#amakawa-nav{padding:0 6px}#amakawa-nav a{padding:0 8px}}
@media print{#amakawa-nav{display:none}html.has-anav body{padding-top:0}}`;

  const link = (it) => {
    const a = document.createElement('a');
    a.href = url(it.href);
    a.dataset.anav = it.id;
    a.textContent = it.label;
    if (it.target) a.target = it.target;
    if (it.external) a.insertAdjacentHTML('beforeend', '<span class="anav-ext" aria-hidden="true">↗</span>');
    return a;
  };
  let bar;
  const mark = () => {
    if (!bar) return;
    const l = here();
    const all = [...ITEMS, ...privateItems];
    // the first item that matches wins, so a page belongs to one entry
    const cur = all.find((it) => { try { return it.match?.(l, R); } catch { return false; } });
    bar.querySelectorAll('a[data-anav]').forEach((a) => {
      if (cur && a.dataset.anav === cur.id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    // on a narrow screen the bar scrolls sideways: bring the current entry into view
    const el = bar.querySelector('[aria-current=page]');
    if (el && (el.offsetLeft < bar.scrollLeft || el.offsetLeft + el.offsetWidth > bar.scrollLeft + bar.clientWidth)) {
      bar.scrollLeft = Math.max(0, el.offsetLeft - 48);
    }
  };
  const paintPrivate = () => {
    if (!bar) return;
    bar.querySelector('.anav-private')?.remove();
    if (!privateItems.length) return;
    const g = document.createElement('span');
    g.className = 'anav-group anav-private';
    g.insertAdjacentHTML('beforeend', '<span class="anav-sep" aria-hidden="true"></span><span class="anav-tag">Private</span>');
    privateItems.forEach((it) => g.append(link(it)));
    g.append(link({ id: 'leave-private', label: 'Leave private', href: '/public' }));
    bar.append(g);
    mark();
  };
  const build = () => {
    const style = document.createElement('style');
    style.id = 'amakawa-nav-style';
    style.textContent = css;
    document.head.append(style);
    bar = document.createElement('nav');
    bar.id = 'amakawa-nav';
    bar.setAttribute('aria-label', 'Tools');
    ITEMS.forEach((it, i) => {
      bar.append(link(it));
      if (it.id === 'showcase' || it.id === 'notes') bar.insertAdjacentHTML('beforeend', '<span class="anav-sep" aria-hidden="true"></span>');
    });
    document.body.prepend(bar);
    document.documentElement.classList.add('has-anav');
    paintPrivate();
    mark();
    addEventListener('hashchange', mark);
    addEventListener('popstate', mark);
  };

  window.AmakawaNav = {
    root: root.href,
    items: () => ITEMS.map((it) => ({ ...it, url: url(it.href) })),
    privateItems: () => privateItems.map((it) => ({ ...it, url: url(it.href) })),
    privateMode,
    ready, // settles once the private registry has loaded (or there is none)
    capability: (id) => capabilities[id] || null,
    // called by /api/nav-private.js (the private registry); hrefs starting with / are on the local server
    addPrivate({ items = [], capabilities: caps = {} } = {}) {
      privateItems = items;
      capabilities = caps;
      paintPrivate();
    },
    mark,
  };

  if (!local || !privateMode) settle();
  if (!local) return;
  if (showBar) { if (document.body) build(); else document.addEventListener('DOMContentLoaded', build, { once: true }); }
  if (!privateMode) return;
  const s = document.createElement('script');
  s.src = origin + '/api/nav-private.js';
  s.async = true;
  s.onload = s.onerror = () => { s.remove(); settle(); };
  document.head.append(s);
})();
