// Build the desktop app. How to use it and what each platform needs: docs/desktop-release.md.
//
//   node desktop/build.mjs [--flavor vanilla|full] [--platform linux|win|mac] [--dev] [--dir]
//
//   --flavor    vanilla (default) or full. They install side by side (own app id, name, executable, userData).
//   --platform  defaults to this machine's
//   --dev       content as a plain folder, no pack, DevTools on; for checking a build quickly
//   --dir       stop at the unpacked app (dist/desktop/<flavor>/out/<os>-unpacked), no installers
//
// Steps: file list (tools/release/files.mjs) -> staged copy at URL paths -> flavor step and word scan
// (tools/release/flavor.mjs, scan.mjs) -> pack (desktop/pak/pack.mjs, key from DESKTOP_PAK_KEY or desktop/.key) ->
// app folder (desktop/lib/app-dir.mjs) -> electron-builder with the Electron fuses set. Output: dist/desktop/<flavor>/.
import fs from 'node:fs';

import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { fileList, stage, stampBuild, checkImports } from './lib/stage.mjs';
import { writeAppDir } from './lib/app-dir.mjs';

const desktop = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(desktop);
const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};
const flag = (name) => args.includes(`--${name}`);
const flavor = opt('flavor', 'vanilla');
const platform = opt('platform', { linux: 'linux', win32: 'win', darwin: 'mac' }[process.platform]);
const DEV = flag('dev');
if (!['vanilla', 'full'].includes(flavor)) throw new Error(`--flavor vanilla|full, not ${flavor}`);
if (!['linux', 'win', 'mac'].includes(platform)) throw new Error(`--platform linux|win|mac, not ${platform}`);

// Names per flavor. The vanilla identity must pass the word scan, so it says nothing of the other flavor.
const IDENTITY = {
  vanilla: {
    name: 'amakawa',
    productName: 'Amakawa',
    appId: 'io.github.fumbleforce.amakawa',
    description: 'A Japanese-learning RPG on a company island.',
  },
  full: {
    name: 'amakawa-complete',
    productName: 'Amakawa Complete',
    appId: 'io.github.fumbleforce.amakawa.complete',
    description: 'A Japanese-learning RPG on a company island. Complete edition.',
  },
}[flavor];
const version = JSON.parse(fs.readFileSync(path.join(desktop, 'package.json'), 'utf8')).version || '0.1.0';

const out = path.join(root, 'dist', 'desktop', DEV ? `${flavor}-dev` : flavor);
const stageDir = path.join(out, 'stage');
const appDir = path.join(out, 'app');
const t0 = Date.now();
const step = (s) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${s}`);

function tool(rel, toolArgs, { required }) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    if (required) throw new Error(`${rel} is not on this checkout yet; a ${flavor} build can't go without it`);
    step(`${rel} not on this checkout yet, skipped (allowed for the full flavor only)`);
    return;
  }
  execFileSync(process.execPath, [file, ...toolArgs], { cwd: root, stdio: 'inherit' });
}

// 1. files, staged at their URL paths
const list = fileList(root, flavor);
const bytes = stage(list, stageDir);
const id = stampBuild(stageDir, root);
step(`staged ${list.length} files, ${(bytes / 1e6).toFixed(0)} MB, build ${id}`);
const missing = checkImports(stageDir);
if (missing.length) throw new Error(`staged modules import files the release left out:\n  ${missing.slice(0, 20).join('\n  ')}`);

// 2. the flavor step (game3d constant __FULL__, dead code removed per file) and, for vanilla, the word scan
tool('tools/release/flavor.mjs', ['--flavor', flavor, '--in', stageDir], { required: flavor === 'vanilla' });
if (flavor === 'vanilla') tool('tools/release/scan.mjs', ['--flavor', 'vanilla', stageDir], { required: true });

// 3. content: the encrypted pack, or the plain folder for --dev (and until desktop/pak/pack.mjs lands)
const packTool = path.join(desktop, 'pak/pack.mjs');
let key = null;
let resource;
if (!DEV && fs.existsSync(packTool)) {
  key = process.env.DESKTOP_PAK_KEY || (fs.existsSync(path.join(desktop, '.key')) ? fs.readFileSync(path.join(desktop, '.key'), 'utf8').trim() : null);
  const listFile = path.join(out, 'pack-list.json');
  const staged = fs
    .readdirSync(stageDir, { recursive: true })
    .map((f) => String(f).split(path.sep).join('/'))
    .filter((f) => fs.statSync(path.join(stageDir, f)).isFile())
    .map((dest) => ({ src: path.join(stageDir, dest), dest }));
  fs.writeFileSync(listFile, JSON.stringify(staged));
  resource = { from: path.join(out, 'content.pak'), to: 'content.pak' };
  execFileSync(process.execPath, [packTool, '--list', listFile, '--out', resource.from], { cwd: root, stdio: 'inherit' });
  key ||= process.env.DESKTOP_PAK_KEY || fs.readFileSync(path.join(desktop, '.key'), 'utf8').trim(); // pack.mjs may have made it
  step(`packed ${staged.length} files into content.pak`);
} else {
  if (!DEV) step('desktop/pak/pack.mjs not on this checkout yet: content goes in as a plain folder (not encrypted)');
  resource = { from: stageDir, to: 'content' };
}

// 4. the app folder
writeAppDir({ desktop, out: appDir, flavor, identity: IDENTITY, version, release: !DEV, key, devResources: null });
if (flavor === 'vanilla') tool('tools/release/scan.mjs', ['--flavor', 'vanilla', appDir], { required: true });
step('app folder written');

// 5. electron-builder
const { build, Platform } = require('electron-builder');
const electronVersion = require('electron/package.json').version;
const target = { linux: Platform.LINUX, win: Platform.WINDOWS, mac: Platform.MAC }[platform];
const targets = flag('dir') ? ['dir'] : { linux: ['AppImage', 'deb'], win: ['nsis', 'portable'], mac: ['dmg', 'zip'] }[platform];
const config = {
  appId: IDENTITY.appId,
  productName: IDENTITY.productName,
  executableName: IDENTITY.name,
  artifactName: `${IDENTITY.name}-\${version}-\${os}-\${arch}.\${ext}`,
  electronVersion,
  directories: { app: appDir, output: path.join(out, 'out'), buildResources: path.join(desktop, 'resources') },
  files: ['**/*'],
  extraResources: [resource],
  asar: true,
  npmRebuild: false,
  nodeGypRebuild: false,
  publish: null,
  electronFuses: {
    runAsNode: false,
    enableCookieEncryption: true,
    enableNodeOptionsEnvironmentVariable: false,
    enableNodeCliInspectArguments: false,
    enableEmbeddedAsarIntegrityValidation: true,
    onlyLoadAppFromAsar: true,
    grantFileProtocolExtraPrivileges: false,
  },
  linux: { category: 'Game', synopsis: IDENTITY.description, maintainer: 'fumbleforce <fumbleforce@users.noreply.github.com>' },
  deb: { packageName: IDENTITY.name },
  win: {},
  nsis: { oneClick: false, allowToChangeInstallationDirectory: true, perMachine: false, shortcutName: IDENTITY.productName },
  portable: { artifactName: `${IDENTITY.name}-\${version}-win-portable.\${ext}` },
  mac: {
    category: 'public.app-category.role-playing-games',
    identity: null, // ad-hoc: no Apple certificate on this machine (docs/desktop-release.md)
    extendInfo: { NSMicrophoneUsageDescription: 'The speaking practice listens to your Japanese.' },
  },
};
config[platform].target = targets;
if (platform === 'linux' && process.platform === 'linux') config.electronDist = path.join(desktop, 'node_modules/electron/dist');
await build({ targets: target.createTarget(targets), config, projectDir: appDir });
step(`built ${platform} (${targets.join(', ')}) in ${path.relative(root, config.directories.output)}`);
for (const f of fs.readdirSync(config.directories.output)) {
  const p = path.join(config.directories.output, f);
  if (fs.statSync(p).isFile() && !/\.(yml|yaml|blockmap)$/.test(f)) console.log(`  ${f}  ${(fs.statSync(p).size / 1e6).toFixed(0)} MB`);
}

