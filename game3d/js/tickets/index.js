// Tickets: the repair requests in Eric's queue, and the company's in-house ticket page on his computers that shows them
// (ui/tickets-view.js). The state is the model's flags (tickets/model.js); the words are the story's
// (story/tickets.js). The contract: game3d/story/FORMAT.md (Tickets); what the player sees: docs/game/systems.md.
//   installTickets(game)   the `ticket` hook (add, start, close; safe to run twice) and the `tickets` hook
//                          (opens the app and waits until it is closed)
//   tickets                the model over the shared flags
import { flags, cond } from '../narrative/state.js';
import { save, sim } from '../sim.js';
import { sfx } from '../sfx.js';
import { createTickets } from './model.js';
import { openTickets } from '../ui/tickets-view.js';
import { learn, known } from '../lang.js';
// imported up front, not on demand: a story's first `ticket` step can run before any lazy load would finish
import TICKETS from '../../story/tickets.js';

export const ticketDefs = () => TICKETS;
// closing a ticket pays Eric its `pay` into his yen (saved with the sim), with a notice so the payment is seen
let paid = () => {};
export const tickets = createTickets({ flags, cond, defs: ticketDefs, onClose: (id, pay) => paid(id, pay) });

export function installTickets(game) {
  paid = (id, pay) => {
    if (!pay) return;
    sim.yen += pay;
    game.ui.refreshBag(sim);
    game.ui.toast(`Paid <b>¥${pay.toLocaleString('en')}</b> for ${id} · ${TICKETS[id]?.title || ''}`);
    sfx('ok');
  };
  // { do: 'ticket', add | start | close: 'T-0002' }: each is a no-op when already so, so a replayed scene is safe
  game.hooks.ticket = ({ add, start, close }) => {
    if (add) tickets.add(add);
    if (start) tickets.start(start);
    if (close) tickets.close(close);
    tickets.sync();
  };
  // { do: 'tickets', show: 'T-0002' }: the app on the computer; resolves when Eric closes it
  game.hooks.tickets = async ({ show } = {}) => {
    tickets.sync();
    game.setHurry?.(false);
    sfx('beep');
    await openTickets({
      list: () => tickets.list(),
      show,
      date: sim.date,
      earned: () => tickets.earned(),
      name: (id) => game.runner?.speaker(id)?.name || id,
      read: (id) => tickets.markRead(id),
      take: (id) => {
        if (!tickets.start(id)) return false;
        sfx('ok');
        save(game);
        return true;
      },
      // the page's Japanese labels (tickets/words.js): a tap teaches one, into the Words panel and the save
      learn: (id) => {
        if (!learn(id)) return false;
        sfx('word');
        game.ui.refreshWords();
        save(game);
        return true;
      },
      isKnown: (id) => known.has(id),
    });
  };
}
