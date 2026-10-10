// The full edition's part of the shell; only the full build carries this folder (desktop/build.mjs).
//   - An age check before anything of the game loads, once per computer: the answer is a small file in userData
//     (a portable install keeps it in its own folder). Until it is given, serve.mjs reads no game file (ready()).
//   - /api/plugins: the optional plugin names in the content, so the game asks only for files that exist
//     (game3d/js/plugins.js; the dev server answers the same route, tools/review_server.py).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { htmlResponse } from '../serve.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PAGE = '/shell/start.html';
const CONTINUE = '/shell/continue';
const LEAVE = '/shell/leave';
const PLUGINS = 'island/private/plugins/';
const FILE = 'first-run.json';

export function create({ source, userData }) {
  const file = path.join(userData, FILE);
  let confirmed = false;
  try {
    confirmed = JSON.parse(fs.readFileSync(file, 'utf8')).adult === true;
  } catch {
    confirmed = false;
  }
  const html = fs.readFileSync(path.join(here, 'start.html'), 'utf8');

  return {
    start: () => (confirmed ? null : `app://game${PAGE}`),
    ready: () => confirmed,
    async handle(pathname) {
      if (pathname === PAGE) return htmlResponse(html);
      if (pathname === '/api/plugins') {
        if (!confirmed) return new Response(null, { status: 403 });
        const names = source
          .list(PLUGINS)
          .map((p) => p.split('/').pop())
          .filter((n) => n.endsWith('.js'))
          .map((n) => n.slice(0, -3))
          .sort();
        return Response.json(names);
      }
      return null;
    },
    // the start page's two buttons are links; main.mjs asks here before it lets a page navigate
    navigate(u) {
      let x;
      try {
        x = new URL(u);
      } catch {
        return null;
      }
      if (x.protocol !== 'app:' || x.host !== 'game') return null;
      if (x.pathname === LEAVE) return { quit: true };
      if (x.pathname !== CONTINUE) return null;
      confirmed = true;
      try {
        fs.mkdirSync(userData, { recursive: true });
        fs.writeFileSync(file, JSON.stringify({ adult: true, at: new Date().toISOString() }) + '\n');
      } catch {
        // can't write: the check simply shows again next launch
      }
      return { to: 'game' };
    },
  };
}
