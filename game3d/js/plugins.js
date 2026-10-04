// Optional local plugins, one file per place. Nothing in this module names a scene.
//
// A plugin is island/private/plugins/<place>.js, git-ignored with the rest of island/private/. The place
// name is the one the story uses (dorm_court, plaza). It loads only while private mode is on: once when
// the place is prepared (places/lifecycle.js), and again if private mode is switched on in that place.
// A missing file, a failed load, or private mode off leaves the place as the public story built it.
// Each place loads at most once for a story object.
//
// The file exports install({ game, story, place }). install may add story.on, story.show, story.nodes
// and place.hooks. It runs before the place is entered, so a pin added there is visible on arrival.
// boot.js, if present, loads once for the whole game and may register a portrait stand-in.
// The published game does not contain these files, and a checkout without them plays the public story.
import { forcePrivateMode, onSettings, settings } from './settings.js';
import { sampleDayOneEnd } from './days.js';

const PLACE = /^[a-z0-9_]+$/;

function pluginHref(name) {
  return `${location.origin}/${['island', 'private', 'plugins'].join('/')}/${name}.js`;
}

// A missing file is a fetch miss, not a script request. The day test treats a script 404 as a failed boot.
async function loadPlugin(name) {
  const href = pluginHref(name);
  const res = await fetch(href);
  if (!res.ok) return null;
  return import(href);
}

// Extra installers (addPlaceInstaller) run for every place right after its own plugin, private mode on only.
// The local scene viewer uses this to add its pins; nothing here knows what they are.
const extras = [];
export function addPlaceInstaller(fn) {
  extras.push(fn);
}

export async function installPlacePlugin(name, ctx) {
  if (!settings.privateMode || !PLACE.test(name)) return false;
  const story = ctx.story;
  if (!story) return false;
  const first = !story._plugins?.[name];
  let loaded = false;
  if (first) {
    let mod = null;
    try {
      mod = await loadPlugin(name);
    } catch {
      mod = null;
    }
    if (mod) {
      story._plugins = story._plugins || {};
      story._plugins[name] = true;
      await mod.install?.(ctx);
      loaded = true;
    }
  }
  story._extras = story._extras || {};
  if (!story._extras[name] && extras.length) {
    story._extras[name] = true;
    for (const fn of extras) await fn(ctx);
  }
  return loaded;
}

// ?scene=<id> on a local server: the private scene viewer (island/private/plugins/viewer.js). Private mode is forced on
// for this page only (in memory, never saved). Without the file, off a local host or without the param the game
// starts as usual and this returns null. Returns what the viewer's start() returns when it took over the boot.
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
  forcePrivateMode();
  return mod.start({ ...ctx, id, addPlaceInstaller, sampleDayOneEnd });
}

let portraitFn = null;
let bootPromise = null;

export function setPortraitSource(fn) {
  portraitFn = fn;
}

export function portraitSource(who, face) {
  return portraitFn?.(who, face) || null;
}

export function installBoot() {
  if (!settings.privateMode) return Promise.resolve(false);
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    try {
      const mod = await loadPlugin('boot');
      if (!mod) {
        bootPromise = null;
        return false;
      }
      await mod.install?.({ setPortrait: setPortraitSource });
      return true;
    } catch {
      bootPromise = null;
      return false;
    }
  })();
  return bootPromise;
}

export function watchPlacePlugins(game) {
  void installBoot();
  onSettings((key) => {
    if (key !== 'privateMode' || !settings.privateMode) return;
    void installBoot();
    if (!game.place?.name) return;
    void installPlacePlugin(game.place.name, { game, story: game.story, place: game.place });
  });
}
