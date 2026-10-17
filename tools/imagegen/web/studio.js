const {document, localStorage, setInterval, clearInterval, fetch} = globalThis;
import {installImages} from '/tools/subplots/web/images.js';
import {$, esc, guarded, notice} from '/tools/subplots/web/common.js';
import {loadStudioComposition, saveStudioComposition} from '/tools/imagegen/web/studio-state.js';
import {fullUrl} from '/tools/imagegen/web/gallery.js';
import {installCreateFromImage} from './create-from-image.js';

const mobile = globalThis.matchMedia('(max-width: 720px)');
const fitControls = () => { $('.studio-controls').open = !mobile.matches; };
fitControls();
mobile.addEventListener('change', fitControls);

let composition = loadStudioComposition(null), selected = null, privateMode = false;
function save() {
  try { saveStudioComposition(localStorage, composition, privateMode); $('#draftStatus').textContent = 'Draft saved in this browser'; }
  catch { $('#draftStatus').textContent = 'Browser storage unavailable. Keep this tab open to preserve the draft.'; }
}
const create = installCreateFromImage({onCharacterCreated: () => composer.connect()});
const composer = installImages(() => null, save, {standalone: {
  getComposition: () => composition,
  setComposition: value => { composition = value; },
  onSelect: image => { selected = image; renderSelection(); },
  actions: create,
}});

function renderSelection() {
  const host = $('#studioSelection');
  host.hidden = !selected;
  if (!selected) return;
  const image = selected;
  host.innerHTML = `<img src="${esc(fullUrl(image, '/api/subplots/image'))}" alt="Selected picture"><div><strong>Selected ${image.n ? 'picture #' + esc(image.n) : 'picture'}</strong><p class="hint">Use this image as the starting point.</p></div><div class="studio-selection-actions"><button type="button" data-create-scene>Create scene</button><button type="button" data-create-character>Create character</button></div>`;
  $('[data-create-scene]', host).onclick = guarded(() => create.scene(image));
  $('[data-create-character]', host).onclick = guarded(() => create.character(image));
}
async function request(path, body) {
  const response = await fetch('/api/' + path, body === undefined ? {} : {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const data = await response.json();
  if (!response.ok || data.error) throw Error(data.error || 'Image service unavailable.');
  return data;
}
async function refreshSession() {
  try {
    const {session, queued, running} = await request('state');
    const s = session || {}, lock = s.lock || {};
    const active = ['on', 'starting', 'lost'].includes(s.state);
    const label = (s.who && {on: 'Rendering for ' + s.who, starting: 'Waiting for the GPU: ' + s.who}[s.state])
      || {on: 'GPU session on', starting: 'Starting GPU session', ending: 'Ending GPU session', lost: 'GPU session lost', error: s.message || 'GPU error'}[s.state]
      || (lock.held && !lock.mine ? 'GPU in use: ' + lock.owner : 'GPU ready');
    const detail = [s.state === 'on' ? Math.ceil((s.idle_left || 0) / 60) + ' idle min left' : '', s.vram ? (s.vram.used / 1024).toFixed(1) + ' / ' + Math.round(s.vram.total / 1024) + ' GB' : ''].filter(Boolean).join(' · ');
    $('#gpu').innerHTML = `<span class="gpu-dot" data-state="${esc(s.state)}"></span><div><strong>${esc(label)}</strong>${detail ? `<span>${esc(detail)}</span>` : ''}</div><button type="button" class="small" data-session ${s.state === 'ending' ? 'disabled' : ''}>${active ? 'End session' : 'Start session'}</button>`;
    $('[data-session]').onclick = guarded(async () => {
      await request('session/' + (active ? 'end' : 'start'), {});
      notice(active ? 'Ending the GPU session.' : 'Starting the GPU session.');
      await refreshSession();
    });
    const queue = $('#studioQueue');
    queue.hidden = !(queued || running);
    queue.innerHTML = `<span>${+running || 0} generating · ${+queued || 0} queued</span><button type="button" class="small" data-cancel-queue>Cancel queue</button>`;
    $('[data-cancel-queue]').onclick = guarded(async () => { await request('cancel', {}); notice('Cancelled the remaining queue.'); await refreshSession(); });
  } catch (error) {
    $('#gpu').textContent = 'GPU status unavailable';
    $('#gpu').title = error.message;
  }
}

document.addEventListener('keydown', event => { if (event.key === 'Tab') document.body.classList.add('kbd'); });
document.addEventListener('pointerdown', () => document.body.classList.remove('kbd'));
guarded(async () => {
  privateMode = !!(await request('mode')).private;
  composition = loadStudioComposition(localStorage, privateMode);
  composer.render();
  await composer.connect();
})();
refreshSession();
const sessionPoll = setInterval(() => { if (!document.hidden) refreshSession(); }, 4000);
globalThis.addEventListener('pagehide', () => clearInterval(sessionPoll));
