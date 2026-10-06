import { KOTODAMA } from '../../../story/day5/index.js';
import { flags } from '../../narrative/state.js';
import { save } from '../../sim.js';
import { expandText } from '../../mc.js';
import { eventId } from '../../narrative/events.js';
import { deliveryReturn } from './delivery-state.js';

// The iframe owns all its listeners, animation frames, sounds and local scores. Removing it
// destroys that document. The world stays live; no old whole-world snapshot is restored.
export async function delivery(game, mode) {
  // A saved return already queued in the runner must not open another session.
  const returns = ['event:kotodama_first', 'event:kotodama_cancel', 'event:kotodama_exit'];
  if (game.runner.queued.some((q) => returns.includes(q.trigger))) return;
  if (mode === 'first' && flags.d5_delivery_seen) {
    if (!game.runner.queued.some((q) => q.trigger === 'event:kotodama_first'))
      game.event(eventId('office', 'kotodama_first'));
    return;
  }
  if (mode === 'rounds' && !flags.d5_team_witnessed) return;
  const session = globalThis.crypto.randomUUID();
  const frame = document.createElement('iframe');
  frame.title = 'Kotodama at B2';
  frame.src = new URL(`minigames/kotodama.html?story=${mode}`, document.baseURI).href;
  frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:10000;background:#121b24';
  game.ui.closeTalk();
  await new Promise((resolve) => {
    const finish = (event) => {
      removeEventListener('message', receive);
      frame.remove();
      // Save the delivered flag and queued continuation together; a reload resumes reactions.
      if (event === 'kotodama_first') game.event(eventId('office', 'kotodama_first'));
      else if (event === 'kotodama_cancel') game.event(eventId('office', 'kotodama_cancel'));
      else game.event(eventId('office', 'kotodama_exit'));
      save(game);
      resolve();
    };
    const receive = (e) => {
      if (e.source !== frame.contentWindow || e.origin !== location.origin) return;
      if (e.data?.type === 'amakawa-kotodama-ready') {
        frame.contentWindow.postMessage(
          {
            type: 'amakawa-kotodama-start',
            config: {
              mode,
              session,
              contract: KOTODAMA,
              launchedMio: expandText(KOTODAMA.text.launchedMio.text),
            },
          },
          location.origin,
        );
        return;
      }
      if (e.data?.type !== 'amakawa-kotodama' || e.data.session !== session) return;
      const event = deliveryReturn(flags, mode, e.data.event, e.data.lastRecipient);
      if (event) finish(event);
    };
    addEventListener('message', receive);
    document.body.append(frame);
    frame.focus();
  });
}
