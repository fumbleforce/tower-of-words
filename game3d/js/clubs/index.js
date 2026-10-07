// Clubs and the notice board (docs/game/systems.md, Clubs and Notice board). The model is clubs/model.js over the
// flags; the clubs, their posters and session nodes are the story's (story/clubs.js; contract in story/FORMAT.md).
//   installClubs(game)          the `noticeboard` hook (reads the plaza's board and waits until it is closed), and the
//                               joined clubs at the top of the People panel (ui.clubsHTML)
//   withClubs(story)            a place's story as loaded, with the club session nodes and members-only markers added
//   clubArrival(game, place)    after a place's start: a club Eric is in that meets here now runs its next session
//   readNotices(game, id)       the board's posts up close, club posters with a slip to take (a thing's act)
//   hasNotices(id)              anything pinned on it
//   clubsHTML(cast)             the joined clubs and their next meeting, at the top of the People panel
import { flags, cond } from '../narrative/state.js';
import { sim, save, PERIODS } from '../sim.js';
import { dateOf } from '../bonds/model.js';
import { personFor } from '../roles.js';
import { PLACE_NAMES } from '../places/definitions.js';
import { findText } from '../finds/index.js';
import { showBoard } from '../ui/finds-view.js';
import { sfx } from '../sfx.js';
import { expandMc } from '../mc.js';
import { createClubs, memberFlag, WEEKDAY_NAMES } from './model.js';
// imported up front: a place's story gets the session nodes as it loads
import CLUBS from '../../story/clubs.js';
import { clubStageReady } from './staging.js';

expandMc(CLUBS);
export const clubs = createClubs({ flags, cond, data: () => CLUBS, dateOf, periods: PERIODS, personFor });
export const BOARD = 'plaza_board';
const PERIOD = {
  early: 'early morning',
  morning: 'morning',
  lunch: 'lunch',
  afternoon: 'afternoon',
  evening: 'evening',
};
const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// 'Saturday 3 Oct, evening'
export const whenText = (m) =>
  `${WEEKDAY_NAMES[m.weekday].en} ${dateOf(m.day).slice(4)}, ${PERIOD[m.period] || m.period}`;
const whereText = (m) => m.where || PLACE_NAMES[m.place] || m.place;

export function withClubs(story) {
  story.nodes = { ...CLUBS.nodes, ...(story.nodes || {}) };
  const show = {};
  for (const id of clubs.ids())
    for (const [thing, c] of Object.entries(clubs.club(id).show || {}))
      show[thing] = `${memberFlag(id)} && (${c === true || c === 'true' ? 'true' : c})`;
  if (Object.keys(show).length) story.show = { ...show, ...(story.show || {}) };
  return story;
}

export function clubArrival(game, place) {
  const due = clubs.due(place, sim.day, sim.period);
  if (!due?.node || !game.story?.nodes?.[due.node] || !clubStageReady(sim.day, due.id, game.place)) return false;
  clubs.attend(due.id, sim.day);
  save(game);
  if (game.busy) game.runner.enqueue(due.node);
  else game.beat(() => game.runner.run(due.node));
  return true;
}

// the board's posts: club posters and single events first, then the neighbours' notes, six at most
function posters() {
  const L = CLUBS.labels || {};
  return clubs.posters(sim.day, sim.period).map((p) => ({
    color: p.kind === 'club' ? 'white' : 'yellow',
    poster: {
      id: p.id,
      ja: p.ja,
      ro: p.ro,
      en: p.kind === 'club' ? p.name : p.title,
      rows: [
        ...(p.kind === 'club' ? [{ label: L.boshu }] : []),
        { label: L.nichiji, ja: WEEKDAY_NAMES[p.next.weekday].ja, value: whenText(p.next) },
        { label: L.basho, value: whereText(p.next) },
      ],
      text: p.kind === 'club' ? p.poster : p.text,
      slip: p.kind === 'club' ? { label: L.nyukai, joined: p.joined } : null,
    },
  }));
}
export function noticePosts(id = BOARD) {
  const notes = findText().boards?.[id] || [];
  return id === BOARD ? [...posters(), ...notes].slice(0, 6) : notes;
}
export const hasNotices = (id = BOARD) => noticePosts(id).length > 0;

function join(game, id) {
  if (!clubs.join(id)) return false;
  sfx('ok');
  save(game);
  const c = clubs.club(id),
    m = clubs.nextMeeting(id, sim.day, sim.period);
  game.ui.toast(`Joined the <b>${esc(c.name)}</b>${m ? ` · ${esc(whenText(m))}, ${esc(whereText(m))}` : ''}`);
  return true;
}
// a thing's act already runs as a beat (gameplay/interactions.js), so this only holds the board up
export function readNotices(game, id = BOARD) {
  const posts = noticePosts(id);
  const teach = posts.some((p) => p.poster?.slip) && !clubs.joined().length;
  return showBoard(posts, {
    take: (clubId) => join(game, clubId),
    note: teach ? 'Take a slip to join a club. Your clubs are listed under People.' : '',
  });
}

export function installClubs(game) {
  // { do: 'noticeboard' }: the plaza's board up close, from a story's own talk:noticeboard node
  game.hooks.noticeboard = () => readNotices(game);
  game.ui.clubsHTML = () => clubsHTML(game.cast); // the People panel's top (gameplay/interactions.js)
}

// People panel: the joined clubs, each with its next meeting and the members Eric has met
export function clubsHTML(cast) {
  const ids = clubs.joined();
  if (!ids.length) return '';
  const rows = ids
    .map((id) => {
      const c = clubs.club(id),
        m = clubs.nextMeeting(id, sim.day, sim.period);
      const met = clubs
        .members(id, cast)
        .filter((p) => sim.met.has(p) && sim.people[p])
        .map((p) => sim.people[p].name);
      return (
        `<div class="club"><span class="club-name">${esc(c.name)} <span class="ja" lang="ja">${esc(c.ja)}</span></span>` +
        `<span class="club-next">${m ? `Next: ${esc(whenText(m))} · ${esc(whereText(m))}` : 'No meeting coming up'}</span>` +
        (met.length ? `<span class="club-with">With ${esc(met.join(', '))}</span>` : '') +
        '</div>'
      );
    })
    .join('');
  return `<li class="clubs"><div class="ch">Clubs</div>${rows}</li>`;
}
