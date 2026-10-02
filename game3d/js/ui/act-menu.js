// The action menu beside the current target (Talk, Look, Pet... on E; Say a word on Q; Next on Tab), mixed into
// the ui object (ui.js). The rules it follows: docs/game/controls-and-ui.md, The HUD.
import { $ } from './dom.js';
import { thingBox, elBox } from './screen-box.js';

export function actMenu({ keyLabel, settings }) {
  return {
    // The action menu (Jørgen's playtest: Talk and Say were separate popups that came and went on their own). One small
    // menu beside the current target: its verb on E (Talk, Look, Pet...) and Say on Q, stacked, both whenever both
    // apply; Next cycles through things in reach when several are close (menu.js). It opens only when the player asks
    // for it (Jørgen, 2026-10-02: "The interaction menu opens automatically everywhere and is very disruptive"): a tap
    // or click on a target that has more than one thing to do (interactions.js use), or Tab. Being in reach only
    // lights up the pin and outlines the model. It closes when the target changes, on any other tap, or a walk key.
    // main.js calls this every frame with whether a word does something at the target in reach.
    openActs(item) {
      this.actFor = item || null;
      this._actKey = '';
    },
    closeActs() {
      this.actFor = null;
    },
    placeSay(show) {
      $('#sayBtn').hidden = true;
      const act = $('#actMenu'),
        g = window.__game;
      if (!act || !g || !g.place) return;
      if (!this._actWired) {
        this._actWired = true;
        // a tap anywhere but the menu closes it (a tap on the same target opens it again, after this)
        addEventListener('pointerdown', (e) => !e.target.closest?.('#actMenu') && this.closeActs(), true);
        addEventListener('keydown', (e) => /^(Arrow|Key[WASD]$|Escape)/.test(e.code) && this.closeActs(), true);
      }
      const blocked =
        !$('#sayMenu').hidden ||
        !$('#cmdsPanel').hidden ||
        [...document.querySelectorAll('.panel')].some((p) => !p.hidden) ||
        document.body.classList.contains('busy') ||
        document.body.classList.contains('trip') ||
        this.talking;
      // only the target in reach (notes/ONBOARDING.md rule 4): never something across the room
      const target = g.near;
      const obw = window.__onboard;
      // the E key cap on the pin in reach, on desktop, until E has been used five times (onboard.js counts uses)
      document.body.classList.toggle('teach-e', !!(target && obw && (obw.uses || 0) < 5));
      if (this.actFor && (blocked || this.actFor !== target)) this.actFor = null;
      if (!target || !this.actFor || (obw && obw.active && !obw.moved)) {
        if (!act.hidden) act.hidden = true;
        this._actKey = '';
        return;
      }
      const ob = window.__onboard || {};
      const phone = document.body.classList.contains('phone');
      const verb = target.verb || (/person/.test(target.kind || '') ? 'Talk' : 'Look'),
        name = target.label || '';
      // Say shows for this target when a word does something here; the first time only at the goal (the cat)
      const sayHere = show && g.sayTarget === target && g.sayRow(target);
      const canUse = !g.canUse || g.canUse(target);
      const uses = ob.uses || 0;
      const cyc = !ob.active && this.cycleInfo && this.cycleInfo.n > 1 ? this.cycleInfo : null;
      const key = [
        target.id,
        verb,
        name,
        sayHere,
        canUse,
        cyc ? cyc.i + '/' + cyc.n : '',
        phone,
        settings.keySay,
        Math.min(uses, 5),
        ob.sayUsed ? 1 : 0,
      ].join('|');
      if (key !== this._actKey) {
        this._actKey = key;
        // Jørgen: "the interaction box is also not very pretty". The name on top, then one row per action: a key cap
        // and the action in one type style. The action row always names its action (Jørgen, 2026-09-30, on a box that
        // had dropped it and showed only the name: "interaction windows but no actions"); the key cap goes after five
        // uses. Phone rows have no key caps.
        const k = (c) => (phone ? '' : `<span class="k">${c}</span>`);
        const head = name ? `<div class="hd">${name}</div>` : '';
        const useFace = `${uses < 5 ? k('E') : ''}<span class="lb">${verb}</span>`;
        act.innerHTML =
          head +
          (canUse ? `<button type="button" class="act use">${useFace}</button>` : '') +
          (sayHere
            ? `<button type="button" class="act say${ob.sayUsed ? '' : ' first'}">${k(keyLabel(settings.keySay || 'KeyQ'))}<span class="lb">Say a word</span></button>`
            : '') +
          (cyc
            ? `<button type="button" class="act next">${k('Tab')}<span class="lb">Next</span><span class="ct">${cyc.i + 1} of ${cyc.n}</span></button>`
            : '');
        act.querySelector('.use')?.addEventListener('click', (e) => {
          e.stopPropagation();
          g.use(g.near || target);
        });
        act.querySelector('.say')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.onSay && this.onSay();
        });
        act.querySelector('.next')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.cycleInfo?.next();
        });
      }
      if (act.hidden) act.hidden = false;
      this._placeActs(act, target, phone);
    },
    // Beside the target's pin, never over Eric, the target or its pin: right of the pin, else left, else above it,
    // else under the target; each clamped to the screen, under the HUD row and clear of the goal box. When none is
    // clear, the one that covers least. A small pointer on the box's near side points at the pin.
    _placeActs(act, target, phone) {
      const g = window.__game;
      const sc = phone ? 1 : +getComputedStyle(document.documentElement).getPropertyValue('--ui') || 1;
      const W = innerWidth,
        H = innerHeight,
        aw = (act.offsetWidth || 160) * sc,
        ah = (act.offsetHeight || 50) * sc;
      const tb = thingBox(g, target);
      let pin = target.el && target.el.style.display !== 'none' ? elBox(target.el.querySelector('.pin')) : null;
      if (!pin && tb)
        pin = { x0: (tb.x0 + tb.x1) / 2 - 15, x1: (tb.x0 + tb.x1) / 2 + 15, y0: tb.y0 - 34, y1: tb.y0 - 4 };
      if (!pin) return;
      const keep = [g.ericBox?.(), tb, pin].filter(Boolean);
      const gb = $('#goal');
      const goalBox = gb && !gb.hidden && gb.offsetParent ? elBox(gb) : null;
      if (goalBox) keep.push(goalBox);
      const top = (phone ? 60 : 64) * sc;
      const gap = 12 * sc,
        cx = (pin.x0 + pin.x1) / 2,
        cy = (pin.y0 + pin.y1) / 2;
      const clamp = ([x, y, side]) => [
        Math.max(8, Math.min(W - aw - 8, x)),
        Math.max(top, Math.min(H - ah - 12, y)),
        side,
      ];
      const cands = [
        [pin.x1 + gap, cy - ah / 2, 'r'],
        [pin.x0 - gap - aw, cy - ah / 2, 'l'],
        [cx - aw / 2, pin.y0 - gap - ah, 'u'],
        [cx - aw / 2, (tb ? tb.y1 : pin.y1) + gap, 'd'],
      ].map(clamp);
      const over = ([x, y]) =>
        keep.reduce(
          (s, k) =>
            s +
            Math.max(0, Math.min(x + aw, k.x1) - Math.max(x, k.x0)) *
              Math.max(0, Math.min(y + ah, k.y1) - Math.max(y, k.y0)),
          0,
        );
      let best = cands[0],
        bo = Infinity;
      for (const c of cands) {
        const o = over(c);
        if (o < bo - 1) [best, bo] = [c, o];
        if (!o) break;
      }
      const [ax, ay, side] = best;
      act.style.transform = `translate(${Math.round(ax)}px, ${Math.round(ay)}px) scale(${sc})`;
      act.classList.toggle('flip', side === 'l');
      act.classList.toggle('up', side === 'u');
      act.classList.toggle('down', side === 'd');
      // the pointer sits level with the pin (or under or over it), wherever the box was clamped to
      act.style.setProperty('--ny', Math.round(Math.max(14, Math.min(ah / sc - 14, (cy - ay) / sc))) + 'px');
      act.style.setProperty('--nx', Math.round(Math.max(14, Math.min(aw / sc - 14, (cx - ax) / sc))) + 'px');
    },
  };
}
