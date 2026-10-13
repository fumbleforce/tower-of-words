import { bookTransfer } from './transfer.js';
import { diningActions } from '../izakaya/actions.js';
import { referenceHands } from './hands.js';
import { referenceCamera } from './camera.js';
import { readingState } from '../../reading-room/state.js';
import { readReference } from '../../reading-room/view.js';
import { REFERENCES, paperId } from '../../reading-room/pages.js';
import { SHELF, TABLE_PAGES, READER } from '../../scenes/research-room/plan.js';
import { flags } from '../../narrative/state.js';
import { save } from '../../sim.js';
import { found, take } from '../../finds/index.js';
import { referenceCopy } from './copy.js';
export function researchActivity(game, P, w) {
  const actions = diningActions(),
    hands = referenceHands(game, P),
    camera = referenceCamera(game, P);
  const transfer = bookTransfer(game, P, w, hands, camera),
    state = readingState(flags, () => save(game));
  const copy = referenceCopy(game, P, hands, transfer);
  const blockedApproach = Symbol('Research approach blocked');
  let active = true;
  const sync = () => w.books.sync(state.read());
  sync();
  const frameReader = () =>
    camera.focus(
      [0.05, -1.7],
      game.player.seated
        ? { distance: P.camera.aspect < 1 ? 3.6 : 2.8, height: 0.7, yaw: -1.35, elev: 0.3 }
        : { distance: 2.6, height: 0.45, yaw: 0.9, elev: 0.22 },
    );
  async function stand(job) {
    if (game.player.seated) await job.wait(game.hooks.stand({ who: 'eric' }));
  }
  async function approach(job, to) {
    await stand(job);
    await job.wait(game.hooks.walk({ who: 'eric', to }));
    if (Math.hypot(game.player.root.position.x - to[0], game.player.root.position.z - to[1]) > 0.26)
      throw blockedApproach;
  }
  async function shelf(job, book) {
    await approach(job, [w.spots.research_shelf[0], SHELF[book][2]]);
    game.hooks.face({ who: 'eric', to: [3.27, SHELF[book][2]] });
  }
  async function read(job) {
    const current = state.read().active;
    if (current) await select(job, current.book, current.seat);
    await job.wait(
      readReference({
        state: state.read,
        change: async (a) => {
          state.act(a);
          sync();
        },
        found,
        seen: (page) => {
          if (page === 'weather-shapes' && !flags.research_weather_seen) {
            flags.research_weather_seen = true;
            save(game);
          }
        },
        keep: (page) => take(game, paperId(page), { show: false }),
        alive: () => job.live() && game.place === P,
      }),
    );
  }
  async function putBack(job) {
    const current = state.read().active;
    if (!current) return;
    await job.wait(game.hooks.sit({ who: 'eric', at: current.seat }));
    const prop = w.books.books[current.book].group;
    await transfer.take(job, prop, current.book);
    await shelf(job, current.book);
    await transfer.place(job, prop, SHELF[current.book], current.book);
    state.act({ type: 'putBack' });
    sync();
  }
  async function select(job, book, seat) {
    if (!P.seats[seat] || !REFERENCES[book]) throw new Error('Unknown reading choice');
    const current = state.read().active;
    if (current?.book === book && current.seat === seat) {
      const target = P.seats[seat],
        pos = game.player.root.position;
      if (!game.player.seated || Math.hypot(pos.x - target.x, pos.z - target.z) > 0.03)
        await job.wait(game.hooks.sit({ who: 'eric', at: seat }));
      return;
    }
    const prop = w.books.books[book].group;
    if (current?.book === book) {
      await job.wait(game.hooks.sit({ who: 'eric', at: current.seat }));
    } else {
      if (current) await putBack(job);
      await shelf(job, book);
    }
    await transfer.take(job, prop, book);
    await job.wait(game.hooks.sit({ who: 'eric', at: seat }));
    await transfer.place(job, prop, TABLE_PAGES[seat], book, Math.PI - P.seats[seat].ry);
    state.act({ type: 'select', book, seat });
    sync();
  }
  return {
    state,
    hands,
    camera,
    snapshot: () => ({ copy: copy.snapshot(), hands: hands.snapshot(), camera: camera.snapshot() }),
    restore(saved) {
      this.activate();
      copy.restore(!!found('research_mori_copy') && saved?.copy);
      hands.restore(saved?.hands);
      camera.restore(saved?.camera);
    },
    activate() {
      active = true;
      state.reload();
      sync();
    },
    update(t) {
      const r = P.people.research_reader;
      r.readingIdle(t);
      hands.update();
      transfer.update();
    },
    leave() {
      active = false;
      actions.cancel();
      transfer.clear();
      hands.release();
      hands.clear();
      camera.release();
      copy.clear();
      const panel = document.querySelector('#findView');
      if (panel) panel.hidden = true;
      sync();
    },
    async act(a) {
      if (!active) return false;
      return actions.run(async (job) => {
        try {
          switch (a.state) {
            case 'select':
              await select(job, a.book, a.seat);
              await read(job);
              break;
            case 'read':
              await read(job);
              break;
            case 'putBack':
              await putBack(job);
              break;
            case 'frameReader':
              await approach(job, w.spots.research_reader);
              game.hooks.face({ who: 'eric', to: [READER.x, READER.z] });
              frameReader();
              break;
            case 'pointBooks':
              await hands.touch(job, game.player, [-0.5, 0.82, -2.2], 'player-books', { hold: true, point: true });
              break;
            case 'readerRest':
              hands.release();
              frameReader();
              break;
            case 'pointShelf':
              hands.release();
              frameReader();
              await hands.touch(job, P.people.research_reader, [0.48, 0.78, -2.17], 'reader-shelf', {
                hold: true,
                point: true,
              });
              break;
            case 'weatherPage':
              await select(job, 'weather', 'research_table_seat');
              state.act({ type: 'turn', page: 1 });
              sync();
              await read(job);
              frameReader();
              break;
            case 'pointGauge':
              await hands.touch(job, P.people.research_reader, [0.17, 0.7, -1.99], 'reader-gauge', { hold: true });
              camera.focus([0.06, -1.84], { distance: 0.95, height: 0.68, yaw: 0.4, elev: 1.15 });
              break;
            case 'cover':
              await select(job, state.read().active?.book || 'weather', 'research_table_seat');
              state.act({ type: 'turn', page: 0 });
              sync();
              frameReader();
              break;
            case 'showCopy':
              if (!found('research_mori_copy')) return false;
              await select(job, 'copier', 'research_table_seat');
              state.act({ type: 'turn', page: 1 });
              sync();
              await copy.show(job);
              frameReader();
              break;
            case 'markCopy':
              await copy.stow(job);
              await hands.touch(job, game.player, [0.2, 0.71, -1.29], 'mark-copier');
              state.act({ type: 'mark' });
              sync();
              frameReader();
              break;
            case 'release':
              hands.release();
              camera.release();
              copy.clear();
              break;
            case 'sit': {
              const current = state.read().active;
              if (current) await select(job, current.book, a.seat);
              else await job.wait(game.hooks.sit({ who: 'eric', at: a.seat }));
              break;
            }
            case 'stand':
              await stand(job);
              camera.release();
              break;
            default:
              throw new Error(`Unknown research action ${a.state}`);
          }
          return game.place === P && job.live();
        } catch (error) {
          if (error !== blockedApproach) throw error;
          hands.release();
          hands.clear();
          camera.release();
          copy.clear();
          return false;
        } finally {
          if (game.place === P && job.live()) sync();
        }
      });
    },
  };
}
