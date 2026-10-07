import { actionShot } from '../day4/shot.js';
import { poolAction } from '../day3/pool-action.js';
import { snapshotPeople, restorePeople, cancelSavedWalk, snapshotObject, restoreObject } from '../saved-people.js';
import { winterProps, WINTER_SPOTS as S } from './winter-props.js';
import { winterActions } from './winter-actions.js';

export function createWinterStage(game, P) {
  const props = winterProps(P.space),
    action = poolAction(game),
    shot = actionShot(P),
    moves = winterActions(game, P, props, action, (value) => {
      phase = value;
    });
  const people = () => ({ eric: game.player, kuro: P.people.kuro, emi: P.people.emi, attendant: P.people.attendant });
  const phone = () => P.camera.aspect < 1;
  let active = false,
    prior = null,
    lastPartner = 'eric',
    phase = 'inactive';
  const ready = () =>
    Object.values(people()).every((r) => {
      const model = r?.model || r?.root;
      return !!(
        r?.root?.visible &&
        (model.getObjectByName('RightHand') ||
          model.getObjectByName('mixamorigRightHand') ||
          r.arms?.[1]?.userData.hand)
      );
    }) && Object.keys(props.rackets).length === 3;
  const groupFrame = () => shot.focus([-1, -7.15], phone() ? 19 : 6, 0.9, 0.1, 0.85);
  const courtFrame = () => shot.focus([-1.1, -10.6], phone() ? 23 : 10, 0.7, phone() ? 1.55 : 0.1, 0.5);
  async function group() {
    await moves.walk('eric', [-1, -6.3], [-1, -8]);
    await moves.walk('kuro', [-2.2, -7.7], [-1, -6.3]);
    await moves.walk('emi', [0.2, -7.7], [-1, -6.3]);
    groupFrame();
    await action.wait(game.wait(1400));
  }
  async function rally(partner) {
    const watcher = partner === 'eric' ? 'emi' : 'eric';
    await moves.walk(watcher, S.watch, S.kuro);
    await moves.walk('kuro', S.kuro, S.eric);
    await moves.walk(partner, S.eric, S.kuro);
    courtFrame();
    await action.wait(game.wait(1100));
    lastPartner = partner;
    await moves.rally(partner, 2);
  }
  function release() {
    action.cancel();
    moves.dispose();
    props.reset();
    for (const r of Object.values(people())) if (r) cancelSavedWalk(r);
    if (prior) {
      const restore = { ...people() };
      if (game.place !== P) delete restore.eric;
      restorePeople(restore, prior);
    }
    active = false;
    prior = null;
    phase = 'inactive';
    props.root.visible = false;
    P.cam.release();
    game.walker.sync();
  }
  return {
    props,
    get ready() {
      return ready();
    },
    get phase() {
      return phase;
    },
    async act({ state, organizing = false }) {
      if (state === 'free' || state === 'reset') {
        release();
        return true;
      }
      if (!ready()) throw new Error('Winter club cast unavailable');
      phase = state;
      const performStep = async () => {
        if (state === 'begin') {
          if (!active) {
            prior = snapshotPeople(people());
            active = true;
            props.root.visible = true;
            const holder = organizing ? 'emi' : 'attendant';
            P.people[holder].root.visible = true;
            moves.hold(holder, props.paper);
          }
          if (organizing) {
            await moves.walk('emi', S.emi, S.attendant);
            await moves.walk('attendant', S.attendant, S.emi);
            await moves.walk('eric', [-6.2, -6.4], S.emi);
            await moves.walk('kuro', [-4.8, -7.5], S.emi);
            shot.focus([-6.4, -7.3], phone() ? 13 : 5, 0.7, 0.1, 0.65);
          } else await group();
          return;
        }
        if (!active) throw new Error('Winter action without a started visit');
        if (state === 'group') await group();
        else if (state === 'sheetBack') {
          if (!moves.emiHasSheet()) return;
          shot.focus([-6.85, -7.7], phone() ? 8 : 3.8, 0.7, 0.75, 0.75);
          await action.wait(game.wait(1100));
          await moves.sheetBack();
        } else if (state === 'demonstrate') {
          await moves.walk('kuro', S.kuro, S.eric);
          courtFrame();
          await action.wait(game.wait(1100));
          await moves.demonstrate();
        } else if (state === 'playerTurn') await rally('eric');
        else if (state === 'emiTurn') await rally('emi');
        else if (state === 'repeat') await rally(lastPartner);
        else throw new Error('Unknown winter activity ' + state);
      };
      return (
        (await action.run(async () => {
          await action.wait(performStep());
          return true;
        })) === true
      );
    },
    update() {
      shot.update();
      moves.update();
    },
    snapshot() {
      return {
        active,
        prior,
        lastPartner,
        shot: shot.snapshot(),
        held: moves.snapshot(),
        people: snapshotPeople(people()),
        props: Object.fromEntries(props.items.map((o) => [o.name, snapshotObject(o)])),
      };
    },
    restore(saved) {
      action.cancel();
      moves.dispose();
      props.reset();
      shot.load(null);
      active = !!saved?.active && ready();
      prior = active ? saved.prior : null;
      lastPartner = saved?.lastPartner || 'eric';
      props.root.visible = active;
      if (!active) return;
      restorePeople(people(), saved.people);
      for (const item of props.items) restoreObject(item, saved.props?.[item.name]);
      moves.restore(saved.held);
      shot.load(saved.shot);
    },
    leave: release,
  };
}
