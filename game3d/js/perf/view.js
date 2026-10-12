// The 3D view: the quality tier, each place's post chain (post.js) with the hover outline, the canvas size and the
// frame's render, with the guard that keeps it drawing on phones (perf/gl-guard.js). main.js runs the loop.
//   const view = createView(game, renderer, canvas, save); view.setComposer(place); view.render(); view.outline
//   view.due(now): whether this display frame is drawn (the frame cap); view.afterDraw(fn): fn right after the next one
import * as THREE from 'three';
import { Q } from '../engine.js';
import { frameCap } from '../settings.js';
import { makePost, GRADE } from '../post.js';
import { styleGrade, currentStyle } from '../style/index.js';
import { liftPeople } from '../look/char-lift.js';
import { OutlinePass } from './outline.js';
import { sizeOnlyWhenOn } from './phone.js';
import { installGlGuard, lighterAfterLoss, onResizeFrame, validSize, disposePost } from './gl-guard.js';

// quality tier 0 low, 1 medium, 2 high (post.js). ?q= forces it; otherwise Settings > Graphics (window.__qualityTier),
// a tier lighter for each time this tab already lost its 3D view
const TIER = { low: 0, medium: 1, high: 2 };
const CAP_MODE = Q.has('cap'); // stills and frame sequences step time exactly: every frame is drawn

export function createView(game, renderer, canvas, save) {
  const tierNow = () =>
    Q.has('q')
      ? +Q.get('q')
      : lighterAfterLoss(
          window.__qualityTier ? (TIER[window.__qualityTier()] ?? 1) : renderer.userData.software ? 0 : 2,
        );
  const view = { quality: tierNow(), composer: null, post: null, outline: null, place: null, draws: 0 };
  game.view = view; // its draws count is what the metrics overlay times (perf/metrics.js)
  const size = () => [+(Q.get('w') || window.innerWidth), +(Q.get('h') || window.innerHeight)];
  function setComposer(place) {
    disposePost(view.composer, [view.place?.beforeAO]); // the last place's chain; its own pass stays with it
    view.place = place;
    const post = (view.post = makePost(renderer, place, view.quality));
    post.resizeOff = sizeOnlyWhenOn([post.gtao, post.bloom]); // passes that are off hold 1x1 targets (perf/phone.js)
    const composer = (view.composer = post.composer);
    // a soft outline on the current target and on what the mouse is over (Jørgen: interactive things should be
    // highlighted slightly); right after the render pass, off at low quality
    const [w, h] = size();
    const outline = (view.outline = new OutlinePass(new THREE.Vector2(w, h), place.scene, place.camera));
    // hidden edges black (the pass adds them): no outline showing through walls (QA round 1)
    outline.visibleEdgeColor.set('#bff1ea');
    outline.hiddenEdgeColor.set('#000000');
    outline.edgeStrength = 5.0;
    outline.edgeThickness = 1.0; // Jørgen: "i want the MODEL ITSELF to get an outline"
    outline.resolve = (l) => place.perf?.forOutline(l) || l; // merged meshes outline through their twins
    // after the place's beforeAO pass, where the train's roof proxy hides (else it masks every target on the train)
    composer.insertPass(outline, place.beforeAO ? 2 : 1);
    applyQuality();
  }
  function applyQuality() {
    const { post, outline, quality } = view;
    const dpr = Math.min(window.devicePixelRatio || 1, Q.has('dpr') ? +Q.get('dpr') : 2, post ? post.dpr(quality) : 2);
    renderer.setPixelRatio(dpr);
    post?.setQuality(quality);
    post?.resizeOff();
    if (outline) outline.enabled = quality > 0;
    if (game.place && game.place.sun) {
      const s = game.place.sun,
        ms = quality ? 2048 : 1024;
      if (s.shadow.mapSize.x !== ms) {
        s.shadow.mapSize.set(ms, ms);
        if (s.shadow.map) {
          s.shadow.map.dispose();
          s.shadow.map = null;
        }
      }
      s.shadow.radius = quality ? 4 : 2;
    }
    resize();
  }
  function resize() {
    const [w, h] = size();
    if (!validSize(w, h)) return; // squeezed to nothing: keep the last size
    renderer.setSize(w, h, !Q.has('w'));
    if (view.composer) {
      view.composer.setPixelRatio(renderer.getPixelRatio());
      view.composer.setSize(w, h);
    }
    document.body.classList.toggle('phone', w / h < 0.8 || w < 640);
    if (game.place) {
      game.place.fit(w / h);
      if (game.player) game.place.cam?.snap?.(game.player.root.position);
    }
  }
  onResizeFrame(resize);
  const guard = installGlGuard({ canvas, renderer, save, resize: () => resize() });
  // Frame pacing: due(now) says whether this display frame should be drawn (and the world stepped). The cap
  // (settings.js frameCap: 60, or 30 at low) keeps a 120 or 144 Hz screen from drawing every refresh. The title's
  // shot moves only by a slow sway, so it draws at most 30 a second (Jørgen, 2026-10-05: an RTX 3080 at about 80 %
  // load with only the title open), and a paused world, which doesn't move, at most 20. A frame counts as due a few
  // ms early so a 60 Hz screen under a 30 cap draws every other refresh rather than drifting.
  const SLACK = 3; // ms
  let cap = frameCap(),
    lastDue = 0;
  function due(now) {
    if (CAP_MODE) return true;
    const paused = game.paused && !game.mapOpen;
    let fps = cap;
    if (document.body.classList.contains('at-title')) fps = fps ? Math.min(fps, 30) : 30;
    if (paused) fps = fps ? Math.min(fps, 20) : 20;
    if (fps && now - lastDue < 1000 / fps - SLACK) return false;
    lastDue = now;
    return true;
  }
  // one-shot callbacks run right after the next frame drawn, while the canvas still holds it (ui/frame-grab.js)
  const drawn = [];
  view.afterDraw = (fn) => drawn.push(fn);
  function render() {
    if (!view.composer || !game.place) return;
    game.place.beforeRender?.();
    renderer.shadowMap.needsUpdate = true;
    view.post.render();
    view.draws++;
    guard.afterRender();
    for (const fn of drawn.splice(0)) fn();
  }
  game.setQuality = (q) => {
    view.quality = q;
    applyQuality();
  };
  window.addEventListener('amakawa:settings', (e) => {
    if (e.detail && e.detail.key === 'quality' && !Q.has('q')) {
      view.quality = tierNow();
      applyQuality();
    }
    if (e.detail && (e.detail.key === 'quality' || e.detail.key === 'frameCap')) cap = frameCap();
  });
  // a change of period while in a place (kit/light/ lightPlace): its new grade and the people's lift, live
  game.regrade = () => {
    if (!view.post || !view.place) return;
    view.post.setGrade(styleGrade({ ...GRADE, ...(view.place.grade || {}) }, currentStyle()));
    liftPeople(game, view.place);
  };
  return Object.assign(view, { setComposer, applyQuality, resize, size, render, due });
}
