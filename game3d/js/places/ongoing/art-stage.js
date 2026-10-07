import { actionShot } from '../day4/shot.js';
import { poolAction } from '../day3/pool-action.js';
import { snapshotPeople, restorePeople, cancelSavedWalk, snapshotObject, restoreObject } from '../saved-people.js';
import { artProps } from './art-props.js';
import { artActions } from './art-actions.js';

export function createArtStage(game, P, { photograph = null, approved = false } = {}) {
  const props = artProps(P.space),
    action = poolAction(game),
    shot = actionShot(P);
  const moves = artActions(game, P, props, action);
  let accepted = approved,
    texture = photograph,
    active = false,
    prior = null,
    drawing = 'blank';
  if (texture) props.photograph(texture);
  const people = () => ({ eric: game.player, mori: P.people.mori });
  const ready = () =>
    !!(accepted && texture?.image?.width > 0 && texture.image.height > 0 && P.people.mori?.sitAt && game.player?.sitAt);
  const frame = () => shot.focus([0.05, -2.75], 4.1 / Math.min(1, (P.camera?.aspect || 1.6) / 1.3), 0.55, 0.1, 0.8);
  const inspect = (point) => shot.focus(point, (P.camera?.aspect || 1.6) < 1 ? 4.8 : 2.3, 0.42, 0.05, 1.05);
  const detail = (point, yaw = 0.65) => shot.focus(point, (P.camera?.aspect || 1.6) < 1 ? 5.8 : 3.1, 0.7, yaw, 0.8);
  function release() {
    action.cancel();
    moves.dispose();
    props.reset();
    for (const r of Object.values(people())) if (r) cancelSavedWalk(r);
    if (prior) {
      restorePeople({ mori: P.people.mori }, prior);
      if (game.place === P) restorePeople({ eric: game.player }, prior);
    }
    prior = null;
    active = false;
    P.cam.release();
    game.walker.sync();
    props.root.visible = ready() && !!P.people.mori.root.visible;
  }
  return {
    props,
    contacts: moves.contacts,
    ready,
    setPhotograph(value, { approved: pick = false } = {}) {
      texture = value;
      accepted = pick;
      props.photograph(value);
      if (!ready()) props.root.visible = false;
    },
    async act({ state }) {
      if (state === 'free') {
        release();
        return true;
      }
      if (!ready()) throw new Error('Art club photograph is not approved and ready');
      const performStep = async () => {
        if (state === 'begin') {
          if (!active) {
            prior = snapshotPeople(people());
            active = true;
            props.root.visible = true;
          }
          await moves.sit('mori');
          await moves.sit('eric');
          frame();
          return;
        }
        if (!active) throw new Error('Art club action without a started visit');
        frame();
        if (state === 'photo') {
          await moves.pointAt('mori', props.photo);
          inspect([0.15, -2.48]);
        } else if (state === 'tracePhoto') await moves.pointAt('mori', props.photo);
        else if (state === 'firstPage') {
          inspect([-0.4, -2.85]);
          await moves.draw('mori', 'oversize');
          drawing = 'oversize';
        } else if (state === 'offerPage')
          await moves.move('eric', props.player.mesh, [0.12, 0.415, -2.99], { carry: true });
        else if (state === 'prepareTea') await moves.pointAt('mori', props.pot);
        else if (state === 'takeTea') {
          await moves.move('eric', props.pot, [0.35, 0.63, -2.99], { carry: true, keepHeld: true });
        } else if (state === 'pour') {
          detail([0.25, -2.85]);
          await moves.pour();
        } else if (state === 'pencilBeside')
          await moves.move('eric', props.pencils[1], [0.12, 0.425, -2.99], { carry: true });
        else if (state === 'drawSlope') {
          detail([-0.25, -2.9], -0.35);
          await moves.draw('mori', 'slope');
          drawing = 'slope';
        } else if (state === 'practice') await moves.pointAt('mori', props.pencils[0]);
        else if (state === 'showProgress') {
          drawing = 'slope';
          props.mori.draw(drawing);
        } else if (state === 'drawTogether') {
          detail([0.05, -2.9], 0.35);
          await moves.draw('eric', 'slope');
          if (drawing === 'slope') await moves.draw('mori', 'slope');
          else await moves.pointAt('mori', props.pencils[0]);
        } else if (state !== 'group') throw new Error('Unknown art activity ' + state);
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
      if (!active) props.root.visible = ready() && !!P.people.mori.root.visible;
    },
    snapshot() {
      return {
        active,
        prior,
        drawing,
        held: moves.snapshot(),
        playerDrawing: props.player.snapshot(),
        cupLevels: [...props.cupLevels],
        shot: shot.snapshot(),
        people: snapshotPeople(people()),
        props: Object.fromEntries(props.items.map((o) => [o.name, snapshotObject(o)])),
      };
    },
    restore(saved) {
      moves.dispose();
      action.cancel();
      if (!saved) {
        active = false;
        prior = null;
        props.reset();
        shot.load(null);
        props.root.visible = ready() && !!P.people.mori.root.visible;
        return;
      }
      active = !!saved.active && ready();
      prior = active ? saved.prior : null;
      shot.load(null);
      props.player.restore(saved.playerDrawing);
      drawing = saved.drawing || 'blank';
      props.mori.draw(drawing);
      props.reset();
      (saved.cupLevels || []).forEach((level, i) => props.fillCup(i, level));
      for (const o of props.items) restoreObject(o, saved.props?.[o.name]);
      if (active) {
        restorePeople(people(), saved.people);
        moves.restore(saved.held);
        shot.load(saved.shot);
      }
      props.root.visible = ready() && (active || !!P.people.mori.root.visible);
    },
    leave: release,
  };
}
