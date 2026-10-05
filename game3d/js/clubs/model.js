// The club model: which clubs Eric has joined, when each meets next, and which session is due where. Plain data over
// the story's flags, so the save, Continue and the next day keep it like any flag, and a condition reads it:
//   club_<id>       true once Eric has taken the club's slip from the notice board
//   clubs_joined    how many clubs he has joined
//   clubprog_<id>   how many of its sessions he has been to (the club's progress)
//   clubday_<id>    the day of the last session he went to (a club meets once that day)
//   clubev_<id>_<event>   true once that special session has run
// The clubs, their meetings and the board's single events are the story's (story/clubs.js). No DOM and no game here,
// so the unit test runs it as is (test/unit/clubs.test.mjs).
import { flagKeys } from '../narrative/engine-flags.js';
const K = flagKeys('game3d/js/clubs/model.js');

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// the poster's weekday, in Japanese beside the English (notes/days3-5-outline.md: 土曜日 beside "Saturday")
export const WEEKDAY_NAMES = {
  Sun: { ja: '日曜日', en: 'Sunday' },
  Mon: { ja: '月曜日', en: 'Monday' },
  Tue: { ja: '火曜日', en: 'Tuesday' },
  Wed: { ja: '水曜日', en: 'Wednesday' },
  Thu: { ja: '木曜日', en: 'Thursday' },
  Fri: { ja: '金曜日', en: 'Friday' },
  Sat: { ja: '土曜日', en: 'Saturday' },
};
export const memberFlag = (id) => K.club + id;
export const progressFlag = (id) => K.clubprog + id;
export const dayFlag = (id) => K.clubday + id;
export const eventFlag = (id, ev) => `${K.clubev}${id}_${ev}`;

// flags: the shared flags; cond(expr): the story's condition evaluator; data(): story/clubs.js; dateOf(day): 'Sat 3 Oct';
// periods: the day's periods in order; personFor(cast, role): roles.js
export function createClubs({ flags, cond, data, dateOf, periods, personFor = () => null }) {
  const all = () => data().clubs || {};
  const club = (id) => all()[id] || null;
  const weekday = (day) => dateOf(day).slice(0, 3);
  const progress = (id) => +flags[progressFlag(id)] || 0;
  const isMember = (id) => !!flags[memberFlag(id)];
  // the meeting line that holds on a day, or null
  const meetingOn = (id, day) =>
    (club(id)?.meets || []).find(
      (m) =>
        m.weekday === weekday(day) &&
        (m.from === undefined || day >= m.from) &&
        (m.until === undefined || day <= m.until),
    ) || null;
  const api = {
    club,
    ids: () => Object.keys(all()),
    isMember,
    progress,
    joined: () => Object.keys(all()).filter(isMember),
    isOpen: (id) => !!club(id) && cond(club(id).open ?? true),
    meetingOn,
    // the next meeting from this day and period on: { day, weekday, period, place, where }. Today's counts until its
    // period has passed or he has been to it.
    nextMeeting(id, day, period) {
      for (let d = day; d < day + 15; d++) {
        const m = meetingOn(id, d);
        if (!m) continue;
        if (d === day && (periods.indexOf(period) > periods.indexOf(m.period) || +flags[dayFlag(id)] === d)) continue;
        return { day: d, weekday: weekday(d), ...m };
      }
      return null;
    },
    // the club meeting here, now, that he hasn't been to yet: { id, node } (members only)
    due(place, day, period) {
      for (const id of api.joined()) {
        const m = meetingOn(id, day);
        if (!m || m.place !== place || m.period !== period || +flags[dayFlag(id)] === day) continue;
        return { id, ...api.session(id) };
      }
      return null;
    },
    // what runs at his next visit: the first special session due, else the next in the list (the last repeats)
    session(id) {
      const c = club(id),
        n = progress(id);
      const ev = (c.events || []).find((e) => !flags[eventFlag(id, e.id)] && n >= (e.after || 0) && cond(e.if ?? true));
      if (ev) return { node: ev.node, event: ev.id };
      const list = c.sessions || [];
      return { node: list[Math.min(n, list.length - 1)] || null, event: null };
    },
    // he is there: the session counts (progress, the day, a special session's flag); returns what runs
    attend(id, day) {
      const s = api.session(id);
      flags[K.clubday + id] = day;
      flags[K.clubprog + id] = progress(id) + 1;
      if (s.event) flags[K.clubev + id + '_' + s.event] = true;
      return s;
    },
    // taking the slip; nothing if he's in already
    join(id) {
      if (!club(id) || isMember(id)) return false;
      flags[K.club + id] = true;
      flags[K.clubs_joined] = api.joined().length;
      return true;
    },
    // who is in it, people ids, roles filled from this game's cast
    members: (id, cast) =>
      (club(id)?.members || []).map((m) => (m.startsWith('role:') ? personFor(cast, m.slice(5)) : m)).filter(Boolean),
    // the board's posts that are up now: the open clubs, then the single events not yet past
    posters(day, period) {
      const clubs = api
        .ids()
        .filter(api.isOpen)
        .map((id) => ({ kind: 'club', id, ...club(id), joined: isMember(id), next: api.nextMeeting(id, day, period) }))
        .filter((p) => p.next);
      const events = (data().events || [])
        .filter(
          (e) =>
            (e.day > day || (e.day === day && periods.indexOf(period) <= periods.indexOf(e.period))) &&
            cond(e.if ?? true),
        )
        .map((e) => ({
          kind: 'event',
          ...e,
          next: { day: e.day, weekday: weekday(e.day), period: e.period, place: e.place, where: e.where },
        }));
      return [...clubs, ...events];
    },
  };
  return api;
}
