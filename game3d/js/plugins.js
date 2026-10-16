// Optional local plugins, one file per place. Nothing in this module names a scene.
//
// A plugin is island/private/plugins/<place>.js, git-ignored with the rest of island/private/. The place
// name is the one the story uses (dorm_court, plaza). It loads only while private mode is on: when the place is
// prepared or entered (places/lifecycle.js), and when private mode is switched on in that place.
// A missing file, a failed load, or private mode off leaves the place as the public story built it.
// Each place loads at most once for a story object.
//
// Switching private mode mid-game (watchPlacePlugins): off ends a plugin's scene that is running (Runner.setOptional),
// starts none, hides its picture and its portraits (portraitSource), and hides every element a plugin marked
// data-private (html[data-private-mode="off"], css/style.css). Its pins and talk need no help: every plugin condition
// reads the live private_mode flag (settings.js). Nothing is deleted: flags, the album and saves stay as they were.
// On again: the boot plugin and this place's plugin install if they haven't, and the place's pins come back.
// What a plugin added to a story is recorded (narrative/optional-steps.js), so a save made in one mode resumes in the other.
//
// The file exports install({ game, story, place }). install may add story.on, story.show, story.nodes
// and place.hooks. It runs before the place is entered, so a pin added there is visible on arrival.
// boot.js, if present, loads once for the whole game and may register a portrait stand-in.
// The published game does not contain these files, and a checkout without them plays the public story.
// The vanilla desktop build replaces this module with tools/release/stubs/plugins.js (tools/release/flavor.mjs).
import { forceSetting, onSettings, settings } from './settings.js';
import { sampleDayOneEnd } from './days.js';
import { voice, stopVoice, setClipResolver } from './audio/core.js';
import { recordInstall } from './narrative/optional-steps.js';

const PLACE = /^[a-z0-9_]+$/;

// Self-reports to the local server (POST /api/diag, tools/review_server.py), so a plugin problem on a machine can be
// read from /tmp/claude-1000/game-diag.log instead of asking for a console. Local hosts only, private mode only.
const LOCAL = /^(127\.0\.0\.1|localhost)$/.test(location.hostname);
export function diag(event, data = {}) {
  if (!LOCAL || !settings.privateMode) return;
  try {
    const body = JSON.stringify({
      event,
      ms: Math.round(performance.now()),
      ...data,
    });
    fetch(`${location.origin}/api/diag`, {
      method: 'POST',
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // reporting must never break the game
  }
}

function pluginHref(name) {
  return `${location.origin}/${['island', 'private', 'plugins'].join('/')}/${name}.js`;
}

// The local server lists the plugin names (/api/plugins), so places without one cost no request. Without the list
// (published build, plain static server) every name is tried.
let listed = null;
function pluginList() {
  listed ??= fetch(`${location.origin}/api/plugins`)
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);
  return listed;
}

// A missing file is a fetch miss, not a script request. The day test treats a script 404 as a failed boot.
// On a local host the plugin files are fetched with cache 'reload' first: import() reads the HTTP cache, and a stale
// boot.js or kit.js kept by the browser hid new plugin code for hours (Jørgen, 2026-10-05: the log showed
// installBoot ok but never the new boot.js running). The fresh fetch replaces the cached copy before the import.
const refreshed = new Set();
async function refresh(name) {
  if (!LOCAL || refreshed.has(name)) return;
  refreshed.add(name);
  await fetch(pluginHref(name), { cache: 'reload' }).catch(() => {});
}
const missing = new Set(); // asked for once: a place entered again doesn't ask again
async function loadPlugin(name) {
  const names = await pluginList();
  if (missing.has(name) || (Array.isArray(names) && !names.includes(name))) return null;
  const href = pluginHref(name);
  if (Array.isArray(names)) await Promise.all(names.map(refresh)); // boot.js imports kit.js and encounters.js
  const res = await fetch(href, LOCAL ? { cache: 'reload' } : undefined);
  if (!res.ok) {
    missing.add(name);
    return null;
  }
  return import(href);
}

// Extra installers (addPlaceInstaller) run for every place right after its own plugin, private mode on only.
// The local scene viewer uses this to add its pins; nothing here knows what they are.
const extras = [];
export function addPlaceInstaller(fn) {
  extras.push(fn);
}

// true when anything was installed now (the place's own plugin or the extra installers)
export async function installPlacePlugin(name, ctx) {
  if (!settings.privateMode || !PLACE.test(name)) return false;
  const story = ctx.story;
  if (!story) return false;
  await installBoot(); // its place installers go in first (guard-swap)
  let mod = null;
  if (!story._plugins?.[name]) {
    try {
      mod = await loadPlugin(name);
    } catch {
      mod = null;
    }
  }
  if (!mod && (story._extras?.[name] || !extras.length)) return false; // nothing new for this story
  return applyPlugin(mod, name, ctx);
}

// The install itself, with what it adds recorded. Exported for the unit test, which hands it a module of its own.
export async function applyPlugin(mod, name, ctx) {
  const story = ctx.story;
  const done = recordInstall(story);
  let changed = false;
  if (mod) {
    story._plugins = story._plugins || {};
    story._plugins[name] = true;
    await mod.install?.(ctx);
    changed = true;
  }
  story._extras = story._extras || {};
  if (!story._extras[name] && extras.length) {
    story._extras[name] = true;
    for (const fn of extras) await fn(ctx);
    changed = true;
  }
  done();
  return changed;
}

// ?scene=<id> on a local server: the private scene viewer (island/private/plugins/viewer.js). Private mode is forced on
// for this page only (in memory, never saved). Without the file, off a local host or without the param the game
// starts as usual and this returns null. The viewer also gets the voice player and the clip resolver hook (audio/core.js)
// to play its own clips. Returns what the viewer's start() returns when it took over the boot.
const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|[a-z0-9-]+\.local)$/;
export async function installViewer(query, ctx) {
  const id = query.get('scene');
  if (id == null || !LOCAL_HOST.test(location.hostname)) return null;
  let mod = null;
  try {
    mod = await loadPlugin('viewer');
  } catch {
    return null;
  }
  if (!mod) return null;
  forceSetting('privateMode', true);
  return mod.start({
    ...ctx,
    id,
    addPlaceInstaller,
    sampleDayOneEnd,
    audio: { voice, stopVoice, setClipResolver },
  });
}

// A local plugin that isn't a place (newgame.js: rows for the new-game screen, ui/new-game.js), whatever private mode
// is. Asked for only on a local host or in the desktop app (window.desktop, desktop/app/preload.cjs), so the published
// site makes no request for it. Null when it isn't there.
export async function localPlugin(name) {
  if (!(LOCAL_HOST.test(location.hostname) || globalThis.desktop) || !PLACE.test(name)) return null;
  try {
    return await loadPlugin(name);
  } catch {
    return null;
  }
}

let portraitFn = null;
let bootPromise = null;

export function setPortraitSource(fn) {
  portraitFn = fn;
}

export function portraitSource(who, face) {
  return (settings.privateMode && portraitFn?.(who, face)) || null;
}

export function installBoot() {
  if (!settings.privateMode) return Promise.resolve(false);
  if (bootPromise) return bootPromise;
  diag('installBoot start');
  bootPromise = (async () => {
    try {
      const mod = await loadPlugin('boot');
      if (!mod) {
        diag('installBoot: boot plugin not found');
        bootPromise = null;
        return false;
      }
      await mod.install?.({ setPortrait: setPortraitSource, diag });
      diag('installBoot ok');
      return true;
    } catch (err) {
      diag('installBoot failed', {
        error: String(err && err.stack ? err.stack : err).slice(0, 600),
      });
      bootPromise = null;
      return false;
    }
  })();
  return bootPromise;
}

// reinstall: the place lifecycle's own step for the place being played (install into its story, then pins again)
export function watchPlacePlugins(game, { reinstall } = {}) {
  void installBoot();
  const apply = () => {
    const on = !!settings.privateMode;
    if (typeof document !== 'undefined') document.documentElement.dataset.privateMode = on ? 'on' : 'off';
    return { on, cut: game.runner?.setOptional?.(on) };
  };
  apply();
  onSettings((key) => {
    if (key !== 'privateMode') return;
    const { on, cut } = apply();
    if (on) return void installBoot().then(() => reinstall?.());
    if (cut) stopVoice();
    Promise.resolve(game.place?.hooks?.picture?.({ state: 'hide' })).catch(() => {});
  });
}

// The private boot plugin (its settings rows and portrait stand-in) starts as soon as this module loads, not
// when the first place is built: the title screen and its Settings come before any place (Jørgen, 2026-10-05: the
// private settings row never showed when Settings was opened from the main menu).
diag('plugins.js loaded', {
  privateMode: settings.privateMode,
  url: import.meta.url,
  path: location.pathname + location.search,
});
if (settings.privateMode) void installBoot();
