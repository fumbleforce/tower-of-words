import { execFileSync } from 'node:child_process';

// The public bible's pictures (tools/bible/pages.py): a commit that adds or changes a Showcase entry or a Review item,
// or the picture rule, registers the pictures the public site shows before it is made. The step copies the missing
// ones from the main checkout, pushes the ones the asset store lacks and stages the media list with the lock file, so a
// new Showcase entry never goes up without its pictures. Refused when a picture of an item the commit changes is in
// neither the lock file nor any checkout.
const TRIGGER = /^(showcase\/|reviews\/|tools\/bible\/pages|bible\/pages-media\.json$)/;

export function checkShowcaseMedia(cwd, { env = process.env } = {}) {
  const staged = execFileSync('git', ['diff', '--cached', '--name-only'], { cwd, env, encoding: 'utf8', timeout: 30000 })
    .split('\n');
  if (!staged.some(name => TRIGGER.test(name))) return null;
  try {
    return execFileSync('python3', ['tools/bible/pages.py', 'register'],
      { cwd, env, encoding: 'utf8', timeout: 3600000, maxBuffer: 16 << 20, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    const lines = `${error.stdout || ''}${error.stderr || ''}`.trim().split('\n');
    throw new Error(`showcase pictures: ${lines.slice(-12).join('\n')}`);
  }
}
