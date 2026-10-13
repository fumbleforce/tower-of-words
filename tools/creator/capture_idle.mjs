// One bounded capture of the idle review. Does not wait on another browser owner.
import { withBrowserJob } from './browser-job.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
await withBrowserJob('codex-idle', async browser => {
  const page=await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:1});
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:8771/tools/creator/idle-review.html',{timeout:30000});
  await page.waitForFunction(()=>window.__done || window.__err,null,{timeout:210000});
  const error=await page.evaluate(()=>window.__err); if(error) throw Error(error);
  if(errors.length) throw Error(errors.join('\n'));
  const dir=path.join(root,'art/parts/candidates/idle-review'); fs.mkdirSync(dir,{recursive:true});
  for(const name of ['eric','mio']) await page.locator('section#'+name).screenshot({path:path.join(dir,name+'.png')});
  const files=['art/parts/anim/idle.glb','art/parts/anim/walk.glb','art/parts/candidates/idle-neutral.glb','tools/creator/idle-review.html','tools/creator/recipe.js'];
  const hashes=Object.fromEntries(files.map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
  fs.writeFileSync(path.join(dir,'capture.json'),JSON.stringify({captured:new Date().toISOString(),hashes},null,2)+'\n');
  console.log('Captured Eric and Mio sheets:',dir);
});
