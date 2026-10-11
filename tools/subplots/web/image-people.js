// Shot overrides replace their complete prompt block, including an intentionally empty string.
// Old compositions without overrides keep the template's full/short behaviour.
export function personWords(c, p, presets) {
  const d = p.data, local = c.people?.[p.id] || {};
  const pick = c.outfit?.[p.id];
  const outfit = typeof pick === 'string' ? presets.outfit?.find(o => o.id === pick)?.data : null;
  const clothes = pick === true ? d.outfit : outfit?.text;
  const appearance = [d.generic ? '' : d.name, d.age, d.look, d.signature, d.build].filter(Boolean).join(', ');
  const resolved = local.appearance ?? appearance;
  return {
    appearance: resolved,
    short: local.appearance ?? (d.short || appearance),
    appearanceNegative: local.appearanceNegative ?? (c.charNegOff?.[p.id] ? '' : d.negative ?? ''),
    clothing: local.clothing ?? (clothes ? 'wearing ' + clothes.replace(/^wearing\s+/i, '') : ''),
    clothingNegative: local.clothingNegative ?? outfit?.negative ?? '',
  };
}
