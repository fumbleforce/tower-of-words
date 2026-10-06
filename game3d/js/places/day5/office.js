import { flags } from '../../narrative/state.js';
import { sfx } from '../../sfx.js';
import { anchor, board, prop, moveProp, inHand, frame } from './props.js';
import { delivery } from './delivery.js';

export function mondayOffice(game, P, cast) {
  const cup = prop(P, [0.1, 0.12, 0.1], '#6a9c80', [-5.7, 0.5, -1.5]);
  const can = prop(P, [0.09, 0.16, 0.09], '#5cc46a', [-4.62, 0.35, -2.0]);
  const soup = prop(P, [0.09, 0.15, 0.09], '#e2c353', [2.6, 0.49, -3]);
  const pot = prop(P, [0.15, 0.22, 0.15], '#708d9c', [2.7, 0.53, -3]);
  const tea = prop(P, [0.08, 0.11, 0.08], '#d7e7df', [2.45, 0.49, -3]);
  const phone = prop(P, [0.07, 0.12, 0.013], '#17242d', [-4.3, 0.65, -0.9]);
  const paper = board(P, ['Request', 'Name:', 'Location:', 'Details:'], {
    w: 0.21,
    h: 0.29,
  });
  paper.rotation.x = -Math.PI / 2;
  const copier = anchor(P, 'copier');
  const box = prop(P, [0.4, 0.12, 0.3], '#eceee9', [copier.x + 0.6, copier.y - 0.25, copier.z]);
  const doorway = anchor(P, 'office_door');
  const door = prop(P, [0.7, 1.65, 0.04], '#5c626b', [doorway.x, 0.825, doorway.z]);
  const knob = prop(P, [0.06, 0.06, 0.1], '#c0c9cb', [doorway.x + 0.26, 0.8, doorway.z + 0.05]);
  const ordinary = ['#688fac', '#e6ac53', '#87b892'].map((color) =>
    prop(P, [0.09, 0.16, 0.09], color, [-4.62, 0.35, -2]),
  );
  const reset = () => {
    cup.visible = can.visible = phone.visible = paper.visible = door.visible = knob.visible = false;
    soup.visible = pot.visible = tea.visible = box.visible = true;
    ordinary.forEach((drink) => {
      drink.visible = false;
    });
  };
  reset();
  async function gather() {
    cast.put('kenji', [-5.1, -1.45], [-4.62, -2.3]);
    cast.put('mori', [-5.95, -0.6], [-4.7, -1.2]);
    cast.put('mio', [-4.8, -0.55], [-4.7, -1.2]);
    const ready = flags.d5_reveal_agreed || flags.d5_delivery_seen;
    if (ready) {
      cup.visible = true;
      cup.position.set(-6.68, 0.46, -1.3);
    } else inHand(P, cup, 'mori');
    phone.visible = !ready && !flags.d5_team_witnessed;
    if (phone.visible) inHand(P, phone, 'kenji');
    await game.walkTo(-5.7, -2.45);
    frame(game, 'vending', 3.5);
  }
  async function ordinaryServe() {
    await gather();
    await game.hooks.gesture({ who: 'kenji', kind: 'point', to: 'vending' });
    sfx('tap');
    sfx('vending');
    can.position.set(-4.62, 0.35, -2);
    can.visible = true;
    await moveProp(game, can, [-4.1, 0.65, -1.25]);
    inHand(P, can, 'kenji');
    for (const [i, who] of ['mori', 'mio', null].entries()) {
      const drink = ordinary[i];
      sfx('tap');
      sfx('vending');
      drink.visible = true;
      drink.position.set(-4.62, 0.35, -2);
      const recipient = who ? P.people[who] : game.player;
      await moveProp(game, drink, [recipient.root.position.x, 0.65, recipient.root.position.z + 0.18]);
      if (who) inHand(P, drink, who);
    }
    await game.wait(600);
  }
  async function printLesson() {
    await game.hooks.walk({ who: 'mori', to: [-2.7, 4.0] });
    await game.walkTo(-2.1, 4.1);
    frame(game, 'copier', 2.7);
    await game.hooks.gesture({ who: 'mori', kind: 'point', to: 'copier' });
    sfx('tap');
    sfx('copier');
    paper.visible = true;
    paper.position.set(copier.x, copier.y - 0.2, copier.z);
    await moveProp(game, paper, [copier.x, copier.y - 0.2, copier.z + 0.3], 1.4);
  }
  async function teamDrinks({ state }) {
    if (state === 'gather') return gather();
    if (state === 'aside') {
      await game.hooks.walk({ who: 'mio', to: [-5.4, -0.05] });
      await game.walkTo(-5.95, 0.15);
      frame(game, 'mio', 2.2);
      return;
    }
    if (state === 'private') {
      cast.hide('emi');
      door.visible = knob.visible = true;
      frame(game, 'office_door', 1.9);
      await game.wait(600);
      frame(game, 'kenji', 2);
      return;
    }
    if (state === 'phoneAway') {
      inHand(P, phone, 'kenji');
      const q = phone.position.clone();
      await moveProp(game, phone, [q.x, 0.35, q.z]);
      phone.visible = false;
      return;
    }
    if (state === 'clear') {
      frame(game, 'mori', 2.2);
      await game.hooks.gesture({ who: 'mori', kind: 'point', to: 'vending' });
      await moveProp(game, cup, [-6.68, 0.46, -1.3]);
      return;
    }
    if (state === 'ordinary') return gather();
    if (state === 'ordinaryServe') return ordinaryServe();
    if (state === 'printLesson') return printLesson();
    if (state === 'guidedDelivery' || state === 'continue') {
      await gather();
      return delivery(game, state === 'guidedDelivery' ? 'first' : 'rounds');
    }
    if (state === 'deliveryPose') {
      await gather();
      inHand(P, can, 'kenji', { side: -1 });
      await game.hooks.gesture({ who: 'kenji', kind: 'point', to: 'vending' });
      game.hooks.look({ who: 'mori', at: 'vending' });
      frame(game, 'kenji', 2.3);
      return;
    }
    if (state === 'free') {
      door.visible = knob.visible = phone.visible = false;
      game.hold = null;
      game.place.cam.release?.();
      await game.walkTo(-4.5, 0.4);
      return;
    }
    throw new Error(`Unknown team drinks state: ${state}`);
  }
  async function day5Office({ state }) {
    frame(game, 'mori', 2.4);
    if (state === 'soup') {
      inHand(P, soup, 'mori');
      soup.rotation.z = 1.2;
      await game.wait(650);
      soup.rotation.z = 0;
    } else if (state === 'tea') {
      pot.visible = tea.visible = true;
      await game.hooks.gesture({ who: 'mori', kind: 'point', to: [2.45, -3] });
    } else throw new Error(`Unknown office state: ${state}`);
  }
  return { hooks: { teamDrinks, day5Office }, restore: reset };
}
