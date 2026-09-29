import { execFileSync } from 'node:child_process';

// Hooks carry repository-local settings, especially an alternate commit index.
// A subprocess operating on another repository must not inherit those settings.
export function isolatedGitEnvironment(environment = process.env) {
  const local = new Set(execFileSync('git', ['rev-parse', '--local-env-vars'],
    { encoding: 'utf8', env: environment }).trim().split('\n'));
  return Object.fromEntries(Object.entries(environment).filter(([name]) =>
    !local.has(name) && !/^GIT_CONFIG_(?:KEY|VALUE)_\d+$/.test(name)));
}
