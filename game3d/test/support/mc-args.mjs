// Who plays and who fills the roles in a test run (docs/game/systems.md, Protagonists): --mc <id> and
// --cast <set or role=person,...> on the command line, or MC= and CAST= in the environment. Takes them out of argv
// and checks them against game3d/data/mc/ and data/cast/roles.json before any browser starts.
import { PROTAGONISTS } from '../../js/mc.js';
import { parseCast } from '../../js/roles.js';

export function mcArgs(argv = process.argv.slice(2), env = process.env) {
  const rest = [],
    o = { mc: env.MC || null, cast: env.CAST || null };
  for (let i = 0; i < argv.length; i++) {
    const m = /^--(mc|cast)(?:=(.*))?$/.exec(argv[i]);
    if (!m) rest.push(argv[i]);
    else o[m[1]] = m[2] ?? argv[++i];
  }
  if (o.mc && !PROTAGONISTS[o.mc]) throw new Error(`--mc ${o.mc}: no such protagonist (${Object.keys(PROTAGONISTS).join(', ')})`);
  const cast = o.cast ? parseCast(o.cast) : null;
  const params = new URLSearchParams();
  if (o.mc) params.set('mc', o.mc);
  if (o.cast) params.set('cast', o.cast);
  // query: '&mc=..&cast=..' to add to a page URL; cast: the resolved map a made save carries
  return { rest, mc: o.mc, cast, spec: o.cast, query: params.size ? '&' + params : '', label: [o.mc, o.cast].filter(Boolean).join(' ') };
}
