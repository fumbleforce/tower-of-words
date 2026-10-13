export function referenceEligibility(place, flags, memory, words, day) {
  const mori = place?.people?.mori;
  const available = !!(
    day >= 2 &&
    place?.name === 'office' &&
    mori?.root.visible &&
    mori.root.parent === place.space &&
    !mori._walk &&
    mori.seated
  );
  return {
    available,
    understood: available && memory.ready('mori_old_reference', words),
    notesRecognized: !!flags.d2_shift_done || memory.has('mio_old_copier_explanation'),
  };
}
