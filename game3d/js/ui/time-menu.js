// Click the date/period chip to wait through free-day periods. Uses the story's period hook so the
// same schedule, daylight, music and save rules apply as waiting at the room's desk.
import { sim, PERIODS, periodName, save } from '../sim.js';
import { flags } from '../narrative/state.js';
import { busyReason } from '../travel/go.js';
import { clubArrival } from '../clubs/index.js';
import { timeChoices } from './time-policy.js';

export function installTimeMenu(game) {
  const button = document.getElementById('clock');
  const root = document.createElement('div');
  root.id = 'timeMenu';
  root.className = 'layer';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'timeHeading');
  root.innerHTML = `<div class="time-scrim"></div><section class="time-card"><header><div><h2 id="timeHeading">Wait until…</h2><p class="time-now"></p></div><button type="button" class="time-close" aria-label="Close time controls" data-first>×</button></header><p class="time-reason" role="status"></p><p class="time-goal"></p><div class="time-options"></div><p class="time-note">Walking and small jobs leave the clock alone.</p></section>`;
  document.body.appendChild(root);
  const $ = (selector) => root.querySelector(selector);
  let open = false,
    wasPaused = false;
  const state = () =>
    timeChoices(
      {
        day: sim.day,
        period: sim.period,
        started: sim.day > 5 || !!flags[`d${sim.day}_started`],
        busy: busyReason(game),
        ended: game.ended,
      },
      PERIODS,
    );
  function close() {
    if (!open) return;
    open = false;
    button.setAttribute('aria-expanded', 'false');
    window.__shell.closeLayer(root);
    game.paused = wasPaused || !!window.__shell.isPaused?.();
  }
  function refresh() {
    const { reason, targets } = state();
    $('.time-now').textContent = `${sim.date} · ${periodName(sim.period)}`;
    $('.time-reason').textContent = reason;
    $('.time-reason').hidden = !reason;
    const goal = sim.day < 3 ? game.ui.goalText : '';
    $('.time-goal').textContent = goal || '';
    $('.time-goal').hidden = !goal;
    $('.time-note').hidden = !!reason;
    const list = $('.time-options');
    list.replaceChildren();
    for (const [i, period] of targets.entries()) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.period = period;
      const label = document.createElement('span'),
        amount = document.createElement('small');
      label.textContent = periodName(period);
      amount.textContent = `${i + 1} period${i ? 's' : ''} later`;
      b.append(label, amount);
      list.appendChild(b);
    }
  }
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    if (open) return close();
    if (
      !game.place ||
      game.mapOpen ||
      document.querySelector('.layer.in') ||
      document.body.classList.contains('at-title')
    )
      return;
    wasPaused = game.paused;
    refresh();
    open = true;
    game.paused = true;
    game.walker?.keys.clear();
    button.setAttribute('aria-expanded', 'true');
    window.__shell.openLayer(root, close);
  });
  button.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' || e.code === 'Space') e.stopPropagation();
  });
  root.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (e.target.closest('.time-close, .time-scrim')) return close();
    const period = e.target.closest('[data-period]')?.dataset.period;
    if (!period) return;
    if (!state().targets.includes(period)) return refresh();
    close();
    await game.beat(async () => {
      game.hooks.period({ to: period });
      if (sim.day === 3) await game.hooks.day3Setup?.();
      if (sim.day > 5) {
        game.hooks.ongoingGoal?.();
        clubArrival(game, game.place.name);
      }
      save(game); // include the final schedule and props, after the period hook's first checkpoint
    });
  });
  root.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.code === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (!['Tab', 'ArrowDown', 'ArrowUp'].includes(e.code)) return;
    const buttons = [...root.querySelectorAll('button')].filter((b) => !b.disabled && b.offsetWidth);
    const i = buttons.indexOf(document.activeElement);
    const back = e.code === 'ArrowUp' || (e.code === 'Tab' && e.shiftKey);
    buttons[(i + (back ? buttons.length - 1 : 1)) % buttons.length]?.focus();
    e.preventDefault();
  });
  root.addEventListener('keyup', (e) => e.stopPropagation());
}
