// An explicit scope option must never silently select (and overwrite) the unrestricted edition.
export function daysArgument(args) {
  const i = args.indexOf('--days');
  if (i < 0) return 'all';
  const value = args[i + 1];
  if (!value || value.startsWith('--')) throw new Error('--days requires all or 1');
  if (args.indexOf('--days', i + 1) >= 0) throw new Error('--days may only be specified once');
  return value;
}

// Flavor controls optional content; days controls how much of the game ships.
export function releaseProfile(flavor, days = 'all') {
  if (!['vanilla', 'full'].includes(flavor)) throw new Error('--flavor must be vanilla or full');
  if (!['all', '1'].includes(String(days))) throw new Error('--days must be all or 1');
  const limited = String(days) === '1';
  const base = flavor === 'full' ? 'amakawa-complete' : 'amakawa';
  const name = base + (limited ? '-day1' : '');
  const productName = (flavor === 'full' ? 'Amakawa Complete' : 'Amakawa') + (limited ? ' Day 1' : '');
  return {
    output: flavor + (limited ? '-day1' : ''),
    days: limited ? 1 : null,
    identity: {
      name,
      productName,
      appId: 'io.github.fumbleforce.amakawa' + (flavor === 'full' ? '.complete' : '') + (limited ? '.day1' : ''),
      description: 'A Japanese-learning RPG on a company island.' + (limited ? ' Day 1 edition.' : flavor === 'full' ? ' Complete edition.' : ''),
    },
  };
}
