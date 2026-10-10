// Vanilla stand-in for game3d/js/plugins.js (tools/release/flavor.mjs swaps it in): the same exports, none of
// which loads anything. flavor.mjs refuses to build when the export lists differ.
export function diag() {}
export function addPlaceInstaller() {}
export async function installPlacePlugin() {
  return false;
}
export async function installViewer() {
  return null;
}
export async function localPlugin() {
  return null;
}
export function setPortraitSource() {}
export function portraitSource() {
  return null;
}
export async function installBoot() {
  return false;
}
export function watchPlacePlugins() {}
