// The Picture tab: the selected picture beat large, and the image generator's history to replace it from.
// A pick is stored in the scene's metadata and applied by the adapter on Save (the private adapter promotes
// the render through tools/assets/live.mjs). Composing a new picture opens the existing composer (images.js).
const { document, URLSearchParams } = globalThis;
import { esc, api } from './common.js';
import { S, edit, select, checkpoint, stepOf, docFor } from './store.js';
import { kindOf, speakerOf } from './model.js';
import { personName, portrait, person } from './names.js';

const asset = (kind, path) => '/api/subplots/image/' + kind + '/' + String(path).split('/').map(encodeURIComponent).join('/');

export function pictureFor(step, sc = S.scene) {
  const slot = step?.imageSlot;
  const chosen = slot ? sc?.metadata?.images?.[slot] : null;
  const image = sc?.images?.find(i => i.id === slot);
  const pending = chosen && !chosen.applied;
  const url = pending ? chosen.url : image?.available === false ? '' : image?.url || step?.imageUrl || '';
  return { url, changed: !!pending, slot, file: image?.file || '', chosen };
}

let filter = { character: '', star: false }, runs = [], loading = false, offline = '', end = false, composer = null, loadedFor = null;

// Everyone who speaks in the scene, for the history filter.
function cast() {
  const ids = new Set();
  const walk = xs => (xs || []).forEach(s => {
    const who = speakerOf(s);
    if (who && who !== 'eric' && person(who)) ids.add(who);
    if (s && typeof s === 'object') for (const k of ['then', 'else', 'sequence']) walk(s[k]);
  });
  walk(S.scene?.steps);
  return [...ids];
}

// Every picture beat in order, for the overview when no picture is selected.
export function allPictures() {
  const out = [];
  const walk = (xs, base) => (xs || []).forEach((s, i) => {
    const path = [...base, i];
    if (kindOf(s) === 'picture') out.push({ path, step: s });
    if (s && typeof s === 'object') for (const k of ['then', 'else', 'sequence']) if (Array.isArray(s[k])) walk(s[k], [...path, k]);
  });
  walk(S.scene?.steps, []);
  return out;
}

export function renderPictureTab(installComposer) {
  const tab = document.getElementById('tabPicture');
  const scene = S.scene;
  if (!scene) { tab.innerHTML = '<p class="quiet pad">Open a scene first.</p>'; return; }
  const step = S.selected ? stepOf(S.selected) : null;
  if (kindOf(step) !== 'picture') {
    const pics = allPictures();
    tab.innerHTML = pics.length
      ? `<p class="quiet">Select a picture in the timeline to change it. This scene has ${pics.length}.</p><div class="pic-overview">${pics.map((p, i) => {
        const pic = pictureFor(p.step);
        return `<button data-i="${i}" class="${pic.url ? '' : 'missing'}">${pic.url ? `<img src="${esc(pic.url)}" alt="" loading="lazy">` : '<span>No picture yet</span>'}<small>${i + 1}</small></button>`;
      }).join('')}</div>`
      : `<p class="quiet pad">${scene.audience === 'public' ? 'Public game scenes play in the 3D world, so they have no pictures. Pictures belong to the private scenes.' : 'This scene has no pictures.'}</p>`;
    tab.querySelectorAll('[data-i]').forEach(b => { b.onclick = () => select(pics[+b.dataset.i].path, { tab: 'picture' }); });
    return;
  }
  // a picture in a part a choice leads to belongs to that part
  const path = S.selected, doc = docFor(path), pic = pictureFor(step, doc);
  const private_ = scene.audience === 'private';
  tab.innerHTML = `
    <figure class="pic-large ${pic.url ? '' : 'missing'}">${pic.url ? `<img src="${esc(pic.url)}" alt="">` : '<div class="missing-box"><strong>No picture yet</strong></div>'}</figure>
    <div class="pic-facts">
      <span class="tag ${private_ ? 'private' : 'public'}">${private_ ? 'Private · Adult' : 'Public game'}</span>
      ${pic.changed ? `<span class="tag new">New pick #${esc(pic.chosen.n ?? '')}, goes live on Save</span><button class="link" data-keep>Keep the old picture</button>` : `<span class="where">${esc(pic.file ? (private_ ? 'island/private/game/' : '') + pic.file : 'Not made yet')}</span>`}
    </div>
    <div class="pic-actions"><button data-compose class="primary-soft">Compose a new picture</button></div>
    <h3>From the image generator</h3>
    <div class="chips" data-chips></div>
    <div class="history" data-history></div>`;
  tab.querySelector('[data-keep]')?.addEventListener('click', () => edit(() => { delete doc.metadata.images[pic.slot]; }));
  tab.querySelector('[data-compose]').onclick = () => {
    checkpoint();
    if (!composer) composer = installComposer();
    document.getElementById('composeDialog').showModal();
    composer.focus(pic.slot);
  };
  const chips = tab.querySelector('[data-chips]');
  const people = cast();
  chips.innerHTML = [['', 'Anyone'], ...people.map(id => [id, personName(id)])].map(([id, label]) =>
    `<button data-who="${esc(id)}" aria-pressed="${filter.character === id}">${portrait(id) ? `<img src="${esc(portrait(id))}" alt="">` : ''}${esc(label)}</button>`).join('')
    + `<button data-star aria-pressed="${filter.star}">★ Starred</button>`;
  chips.querySelectorAll('[data-who]').forEach(b => { b.onclick = () => { filter.character = b.dataset.who; runs = []; renderPictureTab(installComposer); }; });
  chips.querySelector('[data-star]').onclick = () => { filter.star = !filter.star; runs = []; renderPictureTab(installComposer); };
  paintHistory(tab.querySelector('[data-history]'), doc, pic, installComposer);
  if (loadedFor !== JSON.stringify(filter) && !loading && !offline) loadHistory(false, installComposer);
}

function paintHistory(box, doc, pic, installComposer) {
  if (offline) { box.innerHTML = `<p class="warn-text">${esc(offline)}</p><button data-retry>Try again</button>`; box.querySelector('[data-retry]').onclick = () => { offline = ''; loadHistory(false, installComposer); }; return; }
  const renders = runs.flatMap(r => (r.renders || []).map(x => ({ ...x, run: r }))).filter(x => x.file && !x.reject);
  if (!renders.length) { box.innerHTML = `<p class="quiet">${loading ? 'Loading pictures…' : 'No pictures match.'}</p>`; return; }
  box.innerHTML = `<div class="history-grid">${renders.map((r, i) => `<button data-r="${i}" class="${pic.chosen?.id === r.id ? 'on' : ''}" title="${esc((r.run.positive || '').slice(0, 300))}"><img src="${esc(asset('thumb', r.thumb || r.file))}" alt="" loading="lazy"><span>#${esc(r.n ?? '')}${r.star || r.fav ? ' ★' : ''}</span></button>`).join('')}</div>${end ? '' : '<button data-more class="ghost">Show older pictures</button>'}`;
  box.querySelectorAll('[data-r]').forEach(b => {
    b.onclick = () => {
      const r = renders[+b.dataset.r];
      edit(() => {
        doc.metadata.images ||= {};
        doc.metadata.images[pic.slot] = { slot: pic.slot, id: r.id, n: r.n, url: asset('out', r.file), file: r.file, seed: r.seed, positive: r.positive || r.run.positive };
      });
    };
  });
  box.querySelector('[data-more]')?.addEventListener('click', () => loadHistory(true, installComposer));
}

async function loadHistory(more, installComposer) {
  loading = true;
  loadedFor = JSON.stringify(filter);
  const q = new URLSearchParams({ limit: '48', who: 'all' });
  if (filter.character) q.set('character', filter.character);
  if (filter.star) q.set('star', '1');
  if (more && runs.length) q.set('before', runs.at(-1).at);
  try {
    const rows = await api('image/api/history?' + q);
    runs = more ? [...runs, ...rows] : rows;
    end = rows.length < 48;
  } catch (e) {
    offline = /offline|503/i.test(e.message) ? 'The image generator is not running. Start it with tools/imagegen/run.sh, then try again.' : e.message;
  } finally {
    loading = false;
    if (document.querySelector('[data-tab=picture][aria-selected=true]')) renderPictureTab(installComposer);
  }
}
