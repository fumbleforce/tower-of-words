// The build flavor. __FULL__ is true in the dev and web builds, and in the full desktop build, where the optional
// local content can be switched on. The vanilla desktop build has none of it: tools/release/flavor.mjs defines
// __FULL__ as false in every file and minifies, so `if (__FULL__) { ... }` and what is inside it are gone there.
// A module that reads __FULL__ imports this file first, so the global exists before its own code runs (also in Node).
globalThis.__FULL__ ??= true;
