// Small things the monorail passengers can show Eric (the train discoveries), as place hooks for the story:
//   phone      { who: 'youth', state: 'show' | 'point' | 'away' }   he turns to Eric and holds out his phone: the photo
//              of his first goal fills the held view (ui/held-view.js); point: his other hand on the screen, a ring
//              round him in the photo
//              { who: 'music', state: 'show' | 'away' }             she turns her phone to Eric: the video of her
//              practising plays, with its sound
//              { who: 'kuroda', state: 'buzz' | 'tap' }             his phone beside him lights up and buzzes with his
//              12F 9:00 reminder (until tapped); tap: eyes shut, his hand taps it silent and the screen goes dark
//   headphones { who: 'music', state: 'lift' | 'on' }               she lifts the headphone on Eric's side: her guitar
//              leaks out (the hook returns once a few notes have played); on: back over her ear, quiet
//   shopBag    { state: 'ask' | 'close' }                          the woman with the bun's overfull shopping bag on
//              the floor by her feet: ask, she points at its bulging top and looks up at Eric; close, Eric steps up and
//              presses it down while she runs the zip shut, then she pats it (it stays shut)
//   printout   { state: 'show' | 'away' }                          the reader holds a printout up beside his book;
//              the held view shows the book's page and the printout side by side
// Every state is kept in snapshot()/restore(), so Continue and a restarted scene put the props back.
import * as THREE from 'three';
import { phone as phoneProp } from './people.js';
import { chibiPassengers } from '../chibi-passengers.js';
import { reminderScreen, bookPage, printoutSheet } from './held-screens.js';
import { footballPhoto, guitarVideo } from './screen-scenes.js';
import { shopBag } from './shop-bag.js';
import { showHeld, hideHeld, ringHeld } from '../ui/held-view.js';
import { sfx, running, isMuted } from '../sfx.js';

const ease = (k) => k * k * (3 - 2 * k);
const texOf = (c) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
// a phone or sheet held in a chibi's hand, facing where the raised arm points: in the arm's frame, forward is -y and
// up is +z. landscape: the long side across.
function inHand(arm, obj, { landscape = true, sheet = false, tilt = 0 } = {}) {
  const hold = new THREE.Group();
  const m = new THREE.Matrix4();
  if (sheet) m.makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0));
  else if (landscape) m.makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0));
  else m.makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, -1));
  obj.quaternion.setFromRotationMatrix(m);
  hold.add(obj);
  hold.position.set(0, -0.29, 0.02);
  hold.rotation.x = tilt;
  hold.visible = false;
  arm.add(hold);
  return hold;
}
const armState = (a) => [a.rotation.x, a.rotation.y, a.rotation.z];

// car: the car's root (props go in its frame, as the passengers do); nav: its walk grid (the bag on the floor blocks it)
export function trainDiscoveries(game, { people, car, nav, SEAT_Y }) {
  chibiPassengers(people); // with the chibi look: the passengers become generic chibis first, their props moved over
  const { youth, music, kuroda, reader, bun } = people;
  const st = { youth: 'away', music: 'lap', kuroda: 'off', cup: 'on', bag: 0, printout: 'away' };
  const tween = (dur, fn) => game.tween(dur, (k) => fn(ease(k)));
  const armTo = (arm, to, dur = 0.5) => {
    const from = armState(arm);
    return tween(dur, (k) => arm.rotation.set(...from.map((v, i) => v + (to[i] - v) * k)));
  };
  const eric = () => [game.player.root.position.x, game.player.root.position.z];
  // the photo is drawn into a corner of the game's canvas: that has to happen inside a frame, just before the frame's
  // own render covers it, or the corner could show for a frame (update() runs these)
  const inFrame = [];
  const nextFrame = (fn) => new Promise((res) => inFrame.push(() => res(fn())));
  const pan = (r) => Math.max(-0.7, Math.min(0.7, (r.root.position.x - eric()[0]) / 3));

  // ---- the young man: a phone in his near hand (arms[1] faces the aisle), the photo made the first time it's shown
  const yArm = youth.arms[1],
    yRest = armState(yArm),
    yOther = youth.arms[0],
    yOtherRest = armState(yOther);
  const yPhone = inHand(yArm, phoneProp());
  let photo = null;

  // ---- the girl with headphones: her own phone moves from her lap to Eric; the headphone cup on the aisle side
  const mPhone = music.torso.children.find((o) => o.isGroup && o !== music.head && !music.arms.includes(o));
  const mPhoneRest = { p: mPhone.position.clone(), q: mPhone.quaternion.clone() };
  const mPhoneShow = {
    p: new THREE.Vector3(0, 0.2, 0.34),
    q: new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)),
    ),
  };
  // (found by shape now, before the place's look pass may swap geometries)
  const cans = music.headK.children.filter((o) => o.isMesh && /Cylinder|Torus/.test(o.geometry.type));
  const cup = cans.find((o) => o.geometry.type === 'CylinderGeometry' && o.position.x > 0);
  const cupRest = cup.position.clone();
  const mArms = music.arms.map(armState);
  let video = null,
    leak = null,
    playing = null;

  // ---- Hamada: his phone on the seat beside him (his lap is behind Eric when they talk), screen dark until it buzzes
  // one box and one draw: its face is a small canvas, bezel and screen, dark or showing the reminder
  const lock = reminderScreen(),
    kCanvas = Object.assign(document.createElement('canvas'), { width: 120, height: 200 }),
    kTex = texOf(kCanvas);
  const kMat = new THREE.MeshStandardMaterial({ map: kTex, emissive: '#ffffff', emissiveMap: kTex, roughness: 0.4 });
  const kPhone = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.014, 0.156), kMat);
  kPhone.castShadow = true;
  const kScreen = (on) => {
    const g = kCanvas.getContext('2d');
    g.fillStyle = '#232833';
    g.fillRect(0, 0, 120, 200);
    if (on) g.drawImage(lock, 8, 8, 104, 184);
    else {
      g.fillStyle = '#0f131a';
      g.fillRect(8, 8, 104, 184);
    }
    kTex.needsUpdate = true;
    kMat.emissiveIntensity = on ? 0.85 : 0;
  };
  kScreen(false);
  kPhone.position.set(kuroda.root.position.x + 0.36, SEAT_Y + 0.01, kuroda.root.position.z + 0.15);
  kPhone.rotation.set(0, 0.35, 0);
  car.add(kPhone);
  const kArm = kuroda.arms[1],
    kRest = armState(kArm);
  let buzzT = 0;

  // ---- the reader: a printout in his free hand
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.147),
    new THREE.MeshStandardMaterial({ map: texOf(printoutSheet()), roughness: 0.9, side: THREE.DoubleSide }),
  );
  const rHold = inHand(reader.arms[1], sheet, { sheet: true, tilt: -0.8 });
  const rArm = reader.arms[1],
    rRest = armState(rArm);
  let pages = null;

  // ---- the woman with the bun: her shopping bag on the floor by her feet, toward the free end of her bench (on the
  // seat it would sit below the cut-away wall's edge)
  const bag = shopBag();
  bag.position.set(bun.root.position.x + 0.44, 0, bun.root.position.z - 0.36);
  bag.rotation.y = Math.PI + 0.06;
  car.add(bag);
  nav.blockTagged('shopbag', bag.position.x - 0.2, bag.position.x + 0.2, bag.position.z - 0.12, bag.position.z + 0.14);
  const bagAt = () => [bag.position.x, bag.position.z];
  const bArm = bun.arms[0],
    bRest = armState(bArm);

  function stopLeak() {
    leak?.stop(250);
    leak = null;
  }
  function stopVideo() {
    playing?.stop(200);
    playing = null;
  }
  async function listen(ms) {
    if (running() && !isMuted()) await game.wait(ms);
    else await game.wait(400);
  }

  const hooks = {
    phone: async ({ who, state }) => {
      if (who === 'youth') {
        if (state === 'show') {
          youth.lookTarget = eric();
          yPhone.visible = true;
          await armTo(yArm, [-1.5, 0, -0.1], 0.6);
          photo ||= await nextFrame(() => footballPhoto(game.renderer));
          showHeld('youth', [{ canvas: photo.canvas, frame: 'phone' }]);
          st.youth = 'show';
        } else if (state === 'point') {
          await armTo(yOther, [-1.4, 0, 0.45], 0.45);
          ringHeld('youth', photo?.me);
          st.youth = 'point';
          await game.wait(1100); // a moment on the ring before whatever comes next
        } else if (state === 'away') {
          hideHeld('youth');
          await Promise.all([armTo(yArm, yRest, 0.5), armTo(yOther, yOtherRest, 0.4)]);
          yPhone.visible = false;
          youth.lookTarget = null;
          st.youth = 'away';
        }
      } else if (who === 'music') {
        if (state === 'show') {
          music.lookTarget = eric();
          const p0 = mPhone.position.clone(),
            q0 = mPhone.quaternion.clone();
          await Promise.all([
            tween(0.6, (k) => {
              mPhone.position.lerpVectors(p0, mPhoneShow.p, k);
              mPhone.quaternion.slerpQuaternions(q0, mPhoneShow.q, k);
            }),
            armTo(music.arms[0], [-1.45, 0, 0.3], 0.6),
            armTo(music.arms[1], [-1.45, 0, -0.3], 0.6),
          ]);
          video ||= guitarVideo(game.renderer, music, [...cans, mPhone]);
          video.restart();
          stopLeak();
          stopVideo();
          playing = sfx('guitar', { gain: 0.8, pan: pan(music) });
          showHeld('music', [{ canvas: video.canvas, frame: 'phone' }]);
          st.music = 'show';
        } else if (state === 'away' || state === 'lap') {
          hideHeld('music');
          stopVideo();
          const p0 = mPhone.position.clone(),
            q0 = mPhone.quaternion.clone();
          await Promise.all([
            tween(0.5, (k) => {
              mPhone.position.lerpVectors(p0, mPhoneRest.p, k);
              mPhone.quaternion.slerpQuaternions(q0, mPhoneRest.q, k);
            }),
            armTo(music.arms[0], mArms[0], 0.5),
            armTo(music.arms[1], mArms[1], 0.5),
          ]);
          music.lookTarget = null;
          st.music = 'lap';
        }
      } else if (who === 'kuroda') {
        if (state === 'buzz') {
          kScreen(true);
          st.kuroda = 'buzz';
          buzzT = 0;
          sfx('buzz', { pan: pan(kuroda) });
          showHeld('kuroda', [{ canvas: lock, frame: 'phone' }]);
          await game.wait(2200); // two buzzes: long enough to read the reminder
        } else if (state === 'tap') {
          await armTo(kArm, [-0.55, 0, 0.75], 0.55);
          sfx('tap', { pan: pan(kuroda) });
          kScreen(false);
          st.kuroda = 'off';
          showHeld('kuroda', [{ canvas: reminderScreen(true), frame: 'phone' }]);
          await armTo(kArm, kRest, 0.6);
          hideHeld('kuroda');
        }
      }
    },
    headphones: async ({ who = 'music', state }) => {
      if (who !== 'music') return;
      if (state === 'lift') {
        music.lookTarget = eric();
        // the arm comes up beside her head and the cup goes with her hand, off the ear
        const from = armState(music.arms[1]),
          to = [-0.35, 0, 2.45],
          hand = new THREE.Vector3();
        await tween(0.6, (k) => {
          music.arms[1].rotation.set(...from.map((v, i) => v + (to[i] - v) * k));
          music.arms[1].updateWorldMatrix(true, true);
          music.arms[1].userData.hand.getWorldPosition(hand);
          music.headK.worldToLocal(hand);
          cup.position.lerpVectors(cupRest, hand, k * 0.75);
          cup.rotation.y = 0.7 * k;
        });
        stopLeak();
        // what she was listening to, from the fumbled bar on (guitar_practice, tools/feel/pluck.py)
        leak = sfx('guitar', { offset: 2.2, gain: 0.5, pan: pan(music) });
        st.cup = 'lift';
        await listen(1500);
      } else if (state === 'on') {
        stopLeak();
        await Promise.all([
          armTo(music.arms[1], mArms[1], 0.5),
          tween(0.5, (k) => {
            cup.position.lerp(cupRest, k);
            cup.rotation.y *= 1 - k;
          }),
        ]);
        cup.position.copy(cupRest);
        cup.rotation.y = 0;
        st.cup = 'on';
      }
    },
    shopBag: async ({ state }) => {
      if (state === 'ask') {
        bun.lookTarget = eric();
        await game.hooks.gesture({ who: 'bun', kind: 'point', to: bagAt() });
        bun.lookTarget = eric();
      } else if (state === 'close') {
        const [bx, bz] = bagAt();
        await game.hooks.walk({ who: 'eric', to: [bx - 0.02, bz - 0.36] });
        game.hooks.face({ who: 'eric', to: [bx, bz] });
        bun.lookTarget = bagAt();
        const press = game.hooks.gesture({ who: 'eric', kind: 'press', to: [bx, bz] });
        await game.wait(350);
        const reach = armTo(bArm, [-0.75, 0, -0.55], 0.45);
        await tween(0.45, (k) => bag.setClosed(k * 0.8));
        await reach;
        sfx('zip', { pan: pan(bun) });
        await tween(0.9, (k) => {
          bag.setClosed(0.8 + 0.2 * k);
          bag.setSlider(k);
          bArm.rotation.z = -0.55 - 0.35 * k;
        });
        await press;
        st.bag = 1;
        // she pats it twice, then looks back at Eric
        await tween(0.7, (k) => {
          bArm.rotation.x = -0.75 + 0.12 * Math.abs(Math.sin(k * Math.PI * 2));
        });
        bun.lookTarget = eric();
        await armTo(bArm, bRest, 0.45);
      }
    },
    printout: async ({ state }) => {
      if (state === 'show') {
        rHold.visible = true;
        await armTo(rArm, [-1.6, 0, 0.85], 0.6);
        pages ||= [bookPage(), printoutSheet()];
        showHeld('reader', [
          { canvas: pages[0], frame: 'sheet', tilt: -3 },
          { canvas: pages[1], frame: 'sheet', tilt: 2.5 },
        ]);
        st.printout = 'show';
      } else if (state === 'away') {
        hideHeld('reader');
        await armTo(rArm, rRest, 0.5);
        rHold.visible = false;
        st.printout = 'away';
      }
    },
  };

  return {
    hooks,
    update(dt) {
      while (inFrame.length) inFrame.shift()();
      if (st.music === 'show' && video) video.update(dt);
      if (st.kuroda === 'buzz') {
        // it buzzes beside him until he taps it: two pulses every 1.4 s, the phone shivering while it does
        buzzT += dt;
        const c = buzzT % 1.4;
        kPhone.rotation.z = c < 0.9 && c % 0.5 < 0.36 ? Math.sin(buzzT * 90) * 0.05 : 0;
        if (buzzT > 1.4 && c < dt) sfx('buzz', { pan: pan(kuroda) });
      } else kPhone.rotation.z = 0;
    },
    snapshot() {
      return {
        ...st,
        phone: { position: mPhone.position.toArray(), quaternion: mPhone.quaternion.toArray() },
        cupAt: cup.position.toArray(),
        cupTurn: cup.rotation.y,
        slider: bag.slider,
      };
    },
    restore(s) {
      if (!s) return;
      hideHeld();
      stopLeak();
      stopVideo();
      Object.assign(st, {
        youth: s.youth,
        music: s.music,
        kuroda: s.kuroda,
        cup: s.cup,
        bag: s.bag,
        printout: s.printout,
      });
      yPhone.visible = st.youth !== 'away';
      if (s.phone) {
        mPhone.position.fromArray(s.phone.position);
        mPhone.quaternion.fromArray(s.phone.quaternion);
      }
      if (s.cupAt) cup.position.fromArray(s.cupAt);
      cup.rotation.y = s.cupTurn || 0;
      kScreen(st.kuroda === 'buzz');
      rHold.visible = st.printout === 'show';
      bag.setClosed(st.bag || 0);
      bag.setSlider(s.slider ?? (st.bag ? 1 : 0));
    },
    // the photo's and the video's sound: stop when the place goes
    dispose() {
      stopLeak();
      stopVideo();
      hideHeld();
      video?.dispose();
    },
  };
}
