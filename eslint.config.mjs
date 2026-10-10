// Keep runtime browser code separate from Node tools. Capture tools also contain
// browser callbacks passed to Playwright; those callbacks use browser globals.
const readonly = names => Object.fromEntries(names.split(/\s+/).map(name => [name, 'readonly']));
const browser = readonly(`window document navigator location localStorage sessionStorage
  console performance requestAnimationFrame cancelAnimationFrame setTimeout clearTimeout
  setInterval clearInterval fetch URL URLSearchParams CustomEvent Event MouseEvent PointerEvent
  KeyboardEvent Image Audio AudioContext OfflineAudioContext AbortController IntersectionObserver
  ResizeObserver MutationObserver HTMLElement HTMLCanvasElement Blob File FileReader FormData
  getComputedStyle structuredClone queueMicrotask atob btoa devicePixelRatio self Worker
  OffscreenCanvas createImageBitmap SpeechSynthesisUtterance speechSynthesis innerWidth innerHeight
  addEventListener removeEventListener postMessage matchMedia screen history CSS Storage
  PerformanceObserver ImageData AudioNode AudioDestinationNode MediaRecorder HTMLMediaElement prompt confirm`);
const node = readonly(`process Buffer console global setTimeout clearTimeout setInterval clearInterval
  setImmediate clearImmediate queueMicrotask structuredClone URL URLSearchParams fetch
  AbortController AbortSignal TextEncoder TextDecoder performance`);
export default [
  { linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'error' } },
  { ignores: ['**/vendor/**', '**/node_modules/**', '**/__pycache__/**', '**/private/**',
    'legacy/**', 'island/**', 'art/**', '**/shots/**'] },
  { files: ['*.js', 'game3d/**/*.js', 'tools/**/*.js', 'bible/**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: { 'no-undef': 'error', 'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }] } },
  { files: ['game3d/js/**/*.{js,mjs}', 'game3d/story/**/*.{js,mjs}', 'game3d/design/**/*.js', 'game3d/minigames/**/*.js', 'game3d/opening/**/*.js',
    'bible/**/*.js', 'tools/assets/*.js', 'tools/creator/**/*.js', 'tools/imagegen/web/*.js',
    'tools/characters/parts/viewer.js'],
    languageOptions: { globals: browser } },
  // the build flavor flag, set by game3d/js/full.js (tools/release/flavor.mjs defines it false in the vanilla build)
  { files: ['game3d/js/**/*.{js,mjs}', 'game3d/story/**/*.{js,mjs}'], languageOptions: { globals: { __FULL__: 'readonly' } } },
  { files: ['**/*.mjs'], ignores: ['game3d/js/**', 'game3d/story/**', 'game3d/test/support/behavior-trace.mjs'],
    languageOptions: { globals: node } },
  // These two pre-existing tools live beneath js/ until the tooling move.
  { files: ['game3d/js/bonds/test.mjs', 'game3d/js/bonds/day1-check.mjs'], languageOptions: { globals: node } },
  { files: ['**/*.cjs'], languageOptions: { sourceType: 'commonjs',
    globals: { ...node, ...browser, __dirname: 'readonly', __filename: 'readonly' } } },
  // Only these Node scripts contain browser callbacks or explicit browser fakes.
  // A new capture helper must declare that context rather than inheriting DOM globals.
  { files: [
    'game3d/js/bonds/day1-check.mjs', 'game3d/qa/*.mjs',
    'game3d/test/support/behavior-trace.mjs', 'game3d/test/support/open-game.mjs',
    'game3d/test/support/trace-clock.mjs', 'game3d/test/support/framing.mjs', 'game3d/test/support/wait-ready.mjs',
    'game3d/test/routes/driver.mjs',
    'game3d/test/unit/checkpoint.test.mjs', 'game3d/test/unit/save-restore.test.mjs',
    'game3d/tools/canteen-check.mjs', 'game3d/tools/izakaya-staging.mjs', 'game3d/tools/izakaya-check.mjs', 'game3d/tools/day2-legacy-check.mjs', 'game3d/tools/conversation-check.mjs', 'game3d/tools/interact-menu-check.mjs', 'game3d/tools/a11y.mjs', 'game3d/tools/beat-shots.mjs', 'game3d/tools/chair-check.mjs', 'game3d/tools/fast.mjs',
    'game3d/tools/chibi-shots.mjs', 'game3d/tools/chibi-crowd-shots.mjs', 'game3d/tools/chibi-perf.mjs', 'game3d/tools/chibi-tris.mjs', 'game3d/tools/chibi-hitch.mjs', 'game3d/tools/chibi-proportions.mjs', 'tools/characters/chibi-bake.mjs',
    'game3d/tools/hud-shots.mjs', 'game3d/tools/day4-shots.mjs', 'game3d/tools/flavor-finds-check.mjs',
      'game3d/tools/day5-shots.mjs', 'game3d/tools/mc-shots.mjs', 'game3d/tools/mc-check.mjs', 'game3d/tools/new-game-check.mjs','game3d/tools/saves-check.mjs', 'game3d/tools/saves-transfer-check.mjs', 'game3d/tools/people-check.mjs', 'game3d/tools/tickets-check.mjs', 'game3d/tools/map-shots.mjs', 'game3d/tools/map-travel-check.mjs', 'game3d/tools/pins-outline-shots.mjs', 'game3d/tools/pin-tap-check.mjs', 'game3d/tools/pin-tip-check.mjs', 'game3d/tools/pin-count.mjs', 'game3d/tools/lift-door-shots.mjs', 'game3d/tools/look-bench.mjs', 'game3d/tools/train-door-shots.mjs',
    'game3d/tools/look-extra-shots.mjs', 'game3d/tools/look-shots.mjs', 'game3d/tools/lunch-shots.mjs', 'game3d/tools/seat-check.mjs',
    'game3d/tools/opening-frames.mjs', 'game3d/tools/opening-render.mjs', 'game3d/tools/opening-flicker.mjs', 'game3d/tools/perf.mjs', 'game3d/tools/perf/*.mjs', 'game3d/tools/title-idle.mjs',
    'game3d/tools/play.mjs', 'game3d/tools/printer-shots.mjs', 'game3d/tools/shell-shots.mjs',
    'game3d/tools/shoot.mjs', 'game3d/tools/showcase-shots.mjs', 'game3d/tools/soft-collision.mjs',
    'game3d/tools/speech/*.mjs', 'game3d/tools/style-perf.mjs', 'game3d/tools/style-shots.mjs',
    'game3d/minigames/tools/*.mjs', 'game3d/tools/talk-clicks.mjs', 'game3d/tools/type-word-play.mjs', 'game3d/tools/auto-learn-check.mjs', 'game3d/tools/keyboard-fit.mjs', 'game3d/tools/gl-recover-check.mjs', 'game3d/tools/gl-resume-check.mjs', 'game3d/tools/portrait-swap-check.mjs', 'game3d/tools/loop-check.mjs', 'game3d/tools/target-ring-shots.mjs', 'game3d/tools/words-menu-shots.mjs',
    'tools/assets/render3d.mjs', 'tools/assets/shots.mjs', 'tools/bible/check.mjs', 'tools/bible/showcase-check.mjs',
    'tools/characters/snap.mjs', 'tools/characters/parts/viewer-shots.mjs', 'tools/check/behavior-trace.mjs', 'tools/check/*-browser.mjs',
    'tools/creator/base/check_preview.mjs', 'tools/creator/base/run.mjs',
    'tools/creator/capture_idle.mjs', 'tools/creator/run.mjs', 'tools/day1_playtest.mjs',
    'tools/feel/movement-scenes.mjs', 'tools/feel/rec.mjs', 'tools/feel/seq.mjs',
    'tools/figures/posecheck.mjs', 'tools/figures/reproject.mjs', 'tools/figures/room.mjs', 'tools/figures/views.mjs',
  ], languageOptions: { globals: browser } },
  { files: ['tools/audio-list.js', 'tools/opening/capture.js'],
    languageOptions: { sourceType: 'commonjs', globals: { ...node, ...browser,
      __dirname: 'readonly', __filename: 'readonly' } } },
  // Globals published by the archived opening page, read inside page.evaluate.
  { files: ['tools/opening/capture.js'], languageOptions: { globals: { DUR: 'readonly', CUTS: 'readonly' } } },
];
