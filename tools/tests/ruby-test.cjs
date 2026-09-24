// Renders every line in the game at every reading stage and checks that no reading sits above kana.
// Run: NODE_PATH=<dir with playwright> node tools/tests/ruby-test.cjs
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', '8799'], { cwd: path.join(__dirname, '..', '..'), stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:8799/game/'); await p.waitForFunction(() => window.__amakawa);
  const bad = await p.evaluate(() => {
    const { renderJP, SCENES, L } = window.__amakawa;
    const lines = new Set();
    const walk = o => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { for (const k of ['jp', 'label', 'task']) if (typeof o[k] === 'string') lines.add(o[k]); if (Array.isArray(o.options)) o.options.forEach(x => typeof x === 'string' && lines.add(x)); Object.values(o).forEach(walk); } };
    walk(SCENES);
    const out = [];
    for (const stage of [0, 1, 2, 3]) {
      for (const w of Object.values(L().words)) w.stage = stage;
      for (const line of lines) {
        const html = renderJP(line); // also creates word entries
        for (const w of Object.values(L().words)) w.stage = stage;
        const html2 = renderJP(line);
        for (const m of html2.matchAll(/<ruby>([^<]*)<rt>/g)) if (!/[㐀-鿿々〆]/.test(m[1])) out.push({ stage, base: m[1], line });
      }
    }
    return { count: lines.size, out };
  });
  console.log(`lines ${bad.count}, readings above kana: ${bad.out.length}`);
  bad.out.slice(0, 20).forEach(x => console.log(' ', x.stage, x.base, '|', x.line));
  await b.close(); srv.kill();
  process.exit(bad.out.length ? 1 : 0);
})();
