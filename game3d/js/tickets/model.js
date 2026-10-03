// The ticket model: which repair tickets Eric has and where each stands. Plain data over the story's flags, so the
// save, Continue and the next day keep them like any flag, and a condition reads them like any flag.
//   ticket_<ID>     unset until added, then 'new', 'progress' or 'done' (ID is the ticket id without its dash:
//                   T-0002 is ticket_T0002)
//   ticketread_<ID> true once Eric has opened it in the app (the list shows unread ones in bold)
// The ticket texts are the story's (story/tickets.js): { title, from, text, pay, done }. `done` is a condition that
// closes the ticket when it holds (checked by sync()). Taking it shows as ticket_<ID> == 'progress'. Eric is a
// contractor paid per task: `pay` (yen) is his when the ticket closes, once (onClose gets the id and the amount).
// There are no deadlines and no penalties: an open ticket only holds the story where it is.
// No DOM and no game here, so the unit test runs it as is (test/unit/tickets.test.mjs).
import { flagKeys } from '../narrative/engine-flags.js';
const KEYS = flagKeys('game3d/js/tickets/model.js');
export const STATUSES = ['new', 'progress', 'done'];
export const key = (id) => String(id).replace(/[^A-Za-z0-9]/g, '');
export const statusFlag = (id) => KEYS.ticket + key(id);
export const readFlag = (id) => KEYS.ticketread + key(id);

// flags: the shared flags object; cond(expr): the story's condition evaluator; defs(): the story's tickets by id
export function createTickets({ flags, cond, defs, onClose = () => {} }) {
  const def = (id) => defs()[id] || null;
  const payOf = (id) => Math.max(0, Math.round(+def(id)?.pay || 0));
  const status = (id) => (STATUSES.includes(flags[statusFlag(id)]) ? flags[statusFlag(id)] : null);
  const set = (id, s) => {
    if (!def(id)) {
      console.warn('ticket: unknown ticket', id);
      return false;
    }
    flags[KEYS.ticket + key(id)] = s;
    if (s === 'done') onClose(id, payOf(id));
    return true;
  };
  const api = {
    status,
    has: (id) => !!status(id),
    read: (id) => !!flags[readFlag(id)],
    // a new ticket in Eric's queue; nothing if it's there already (in any state)
    add(id) {
      if (status(id)) return false;
      return set(id, 'new');
    },
    // he takes it: new (or not yet added) to in progress
    start(id) {
      const s = status(id);
      if (s === 'progress' || s === 'done') return false;
      return set(id, 'progress');
    },
    close(id) {
      if (status(id) === 'done') return false;
      return set(id, 'done');
    },
    markRead(id) {
      if (!status(id)) return;
      flags[KEYS.ticketread + key(id)] = true;
    },
    // tickets whose `done` condition holds close themselves; returns the ids that closed
    sync() {
      const closed = [];
      for (const [id, d] of Object.entries(defs())) {
        const s = status(id);
        if (s && s !== 'done' && d.done && cond(d.done)) {
          set(id, 'done');
          closed.push(id);
        }
      }
      return closed;
    },
    // Eric's tickets in id order, the story's words with the status over them
    list() {
      return Object.keys(defs())
        .filter((id) => status(id))
        .sort()
        .map((id) => ({ id, ...def(id), pay: payOf(id), status: status(id), read: api.read(id) }));
    },
    open: () => api.list().filter((t) => t.status !== 'done').length,
    // what the closed tickets have paid him
    earned: () => api.list().reduce((sum, t) => sum + (t.status === 'done' ? t.pay : 0), 0),
  };
  return api;
}
