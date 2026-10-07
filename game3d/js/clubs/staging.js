// Continuing sessions only start when their physical scene is ready. A missing
// reviewed asset must not consume attendance or queue an action that will fail.
const STAGES = { art: 'artClub', karaoke: 'karaokeClub', swimming: 'winterClub' };
export function clubStageReady(day, club, place) {
  if (day <= 5 || !STAGES[club]) return true;
  const stage = place?.[STAGES[club]];
  if (club === 'karaoke' && stage?.performanceReady !== true) return false;
  return typeof stage?.ready === 'function' ? stage.ready() === true : stage?.ready === true;
}
