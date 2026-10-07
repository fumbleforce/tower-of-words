// Load authoring data only. No game, renderer, save, or live scene is constructed.
export const WEEK_REQUIREMENTS = {
  art: { review: 'mori-photo-1', label: 'Travel photograph', need: 'The photograph must be picked, loaded and accepted by the art stage.', source: 'game3d/js/places/ongoing/art-stage.js' },
  karaoke: { review: 'karaoke-song-1', label: 'Sung performance', need: 'A picked song and a complete visible performance are required. Queue and microphone staging alone do not unlock the session.', source: 'game3d/js/clubs/staging.js' },
};
export async function loadRecurringWeek(base) {
  const json = async path => {
    const response = await fetch(new URL(path, base), { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Could not load ${path}`);
    return response.json();
  };
  try {
    const [plan, clubs, roles, places] = await Promise.all([
      import(new URL('game3d/js/places/ongoing/plan.js', base)),
      import(new URL('game3d/story/clubs.js', base)),
      json('game3d/data/cast/roles.json'),
      import(new URL('game3d/js/places/definitions.js', base)),
    ]);
    const requirements = await Promise.all(Object.entries(WEEK_REQUIREMENTS).map(async ([id, info]) => {
      const review = await json(`reviews/${info.review}/review.json`).catch(() => null);
      return [id, { ...info, reviewStatus: review?.status || 'unavailable' }];
    }));
    return { weeklyPlan: plan.weeklyPlan, clubs: clubs.default.clubs, roles: roles.roles, placeNames: places.PLACE_NAMES, requirements: Object.fromEntries(requirements) };
  } catch {
    return { unavailable: 'The continuing-week sources are not available in this build. Relationship stages and opening days remain available.' };
  }
}
