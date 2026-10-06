import assert from 'node:assert/strict';
import { openGame } from '../support/open-game.mjs';
import { waitForGame } from '../support/wait-ready.mjs';
import { newFrame } from '../../js/narrative/checkpoint.js';
import { scopedRoute } from '../../../tools/bible/check-scope.mjs';
import train from '../../story/train.js';
import gate from '../../story/gate.js';
import office from '../../story/office.js';
import { STORIES as day2 } from '../../story/day2/index.js';
import { STORIES as day3 } from '../../story/day3/index.js';
import { STORIES as day4 } from '../../story/day4/index.js';
import { STORIES as day5 } from '../../story/day5/index.js';
import CLUBS from '../../story/clubs.js';
export const stories = { train, gate, office };
// day 3's set with the swimming club's pool session in the pool's story, as the game plays it (clubs/index.js
// withClubs); the winter branch is a later Saturday's
const clubNodes = Object.fromEntries(Object.entries(CLUBS.nodes).filter(([id]) => !/winter/.test(id)));
const day3Played = { ...day3, pool: { ...day3.pool, nodes: { ...clubNodes, ...day3.pool.nodes } } };
// each day's story set; a seed with day: 2 checkpoints into day 2's (story/day2/), day: 3 into day 3's
const days = { 1: stories, 2: day2, 3: day3Played, 4: day4, 5: day5 };
const DAY_NAMES = { 1: 'Day one', 2: 'Day two', 3: 'Day three', 4: 'Day four', 5: 'Day five' };

export function choiceInventory(day = 1) {
  const found = [];
  for (const [place, story] of Object.entries(days[day])) for (const [node, steps] of Object.entries(story.nodes)) {
    const walk = (list, path = []) => list.forEach((step, index) => {
      const at = [...path, index];
      step?.choice?.forEach((option, i) => found.push({ id: `${place}:${node}:${at.join('.')}:${i}`, text: option.text }));
      for (const branch of ['then', 'else']) if (Array.isArray(step?.[branch])) walk(step[branch], [...at, branch]);
    });
    walk(steps);
  }
  return found;
}

// who: --mc / --cast (test/support/mc-args.mjs); the save carries them as a new game started with them would
function seedSave(seed, who = {}) {
  const place = seed.place, period = seed.period || 'morning', day = seed.day || 1;
  const known = seed.known || [];
  const flags = { place, period, ...seed.flags };
  const execution = seed.node ? { v: 3, place, frames: [newFrame(seed.node, days[day][place].nodes[seed.node])] } : null;
  return { v: 1, day, place, period, flags, known, seen: [], found: seed.found || [], taught: {}, met: seed.met || [],
    inv: seed.inv || [], yen: seed.yen ?? 1000, bonds: seed.bonds || {},
    ui: { goal: 'Continue the branch under test.', sideGoal: '' },
    runner: { onceDone: seed.onceDone || [], execution }, pendingStart: null,
    ...(who.mc ? { mc: who.mc } : {}), ...(who.cast ? { cast: who.cast } : {}),
    ...(seed.world ? { world: seed.world } : {}) };
}

async function installDriver(page, route, resume = false, made = 0) {
  await page.evaluate(async ({ choices, pauseAt, resume, delivery, pauseDelivery }) => {
    const g = window.__game;
    const { ui, setMuted } = await import(new URL('js/ui.js', location.href));
    const { cond } = await import(new URL('js/narrative/state.js', location.href));
    const state = window.__branch = { nodes: [], lines: [], actions: [], choices: [], errors: [], queue: [...choices], actionDone: true };
    const say = ui.say;
    ui.say = function (...args) {
      const pending = say.apply(this, args);
      state.lines.push(document.querySelector('#talk .line').textContent);
      return pending;
    };
    setMuted(true); ui.auto = true;
    const previous = g.onNode;
    g.onNode = (node, phase) => {
      previous?.(node, phase);
      if (phase === 'start') {
        state.nodes.push(node);
        if (!resume && pauseAt === node) ui.auto = false;
      }
    };
    ui.autoPick = chips => {
      const step = g.runner.lastStep;
      if (!step?.choice) {
        if (chips.length !== 1) state.errors.push('Unexpected non-story choice: ' + chips.map(c => c.html).join(' | '));
        return 0;
      }
      const wanted = state.queue.shift();
      const options = step.choice.filter(option => cond(option.if));
      const index = options.findIndex(option => option.text === wanted);
      if (index < 0) {
        state.errors.push(`Expected choice ${JSON.stringify(wanted)} at ${g.runner.currentNode}; available: ${options.map(o => o.text).join(' | ')}`);
        return 0;
      }
      const node = g.runner.currentNode;
      let path;
      const find = (list, prefix = []) => list.forEach((item, i) => {
        if (item === step) path = [...prefix, i];
        for (const branch of ['then', 'else']) if (Array.isArray(item?.[branch])) find(item[branch], [...prefix, i, branch]);
      });
      find(g.runner.story.nodes[node]);
      state.choices.push(`${g.place.name}:${node}:${path?.join('.')}:${step.choice.indexOf(options[index])}`);
      return index;
    };
    // Exercise the existing fast-forward control; no hooks, effects or runner branches are mocked.
    // The ticket app (ui/tickets-view.js) waits for the player: close it with its own × control, taking nothing.
    state.timer = setInterval(() => {
      g.setHurry(true);
      const embedded = document.querySelector('iframe[title="Kotodama at B2"]')?.contentDocument;
      if (embedded && delivery && (!pauseDelivery || resume)) {
        if (['kenji', 'mori', 'mio'].includes(delivery)) {
          const mg = embedded.defaultView.mg;
          if (mg?.expect && mg.steps !== state.deliveryStep) {
            state.deliveryStep = mg.steps;
            if (state.deliveredTo === delivery) embedded.querySelector('.story-leave')?.click();
            else if (mg.expect.kind === 'fill') {
              const people = mg.expect.seq.filter(s => s.startsWith('.person')).map(s => s.match(/data-thing="(.*?)"/)[1]);
              for (const selector of mg.expect.seq) embedded.querySelector(selector)?.click();
              state.deliveredTo = people.at(-1);
            } else if (mg.expect.kind === 'tap') embedded.querySelector(mg.expect.sel)?.click();
          }
        } else {
          const button = embedded.querySelector(delivery === 'first' ? '.hint-glow' : '.story-leave');
          if (button && !button.disabled) button.click();
        }
      }
      const app = document.getElementById('ticketsApp');
      if (app && !app.hidden) {
        state.ticketApps = (state.ticketApps || 0) + 1;
        app.querySelector('.tk-close').click();
      }
      // the notice board up close (ui/finds-view.js): read, then closed with a tap, no slip taken
      const board = document.getElementById('boardView');
      if (board && !board.hidden && board.classList.contains('in')) {
        state.boards = (state.boards || 0) + 1;
        board.click();
      }
    }, 30);
  }, { choices: (route.choices || []).slice(made), pauseAt: route.resumeAt, resume, delivery: route.delivery, pauseDelivery: route.resumeInDelivery }); // (made: picked before a reload)
}

async function continueSave(page) {
  await page.locator('#title .mcont').click();
  await page.locator('#saves button.slot').filter({ hasText: 'Autosave' }).click();
}
async function settled(page, place) {
  await page.waitForFunction(place => {
    const g = window.__game;
    return window.__branch.errors.length || (g?.place?.name === place && g.saveEnabled && !g.busy && !g.saying &&
      !g.walker.path && !g.runner.frames.length && window.__branch.actionDone && !document.body.classList.contains('at-title'));
  }, place, { timeout: 45000 });
  const errors = await page.evaluate(() => window.__branch.errors);
  assert.deepEqual(errors, []);
}

async function action(page, step, place) {
  const before = await page.evaluate(() => ({ nodes: window.__branch.nodes.length, lines: window.__branch.lines.length }));
  if (step.type === 'give') await page.locator('#sayMenu').waitFor({ state: 'hidden', timeout: 5000 });
  const gift = await page.evaluate(async step => {
    const g = window.__game, state = window.__branch;
    const { ui } = await import(new URL('js/ui.js', location.href));
    const target = g.markers.list.find(marker => marker.id === step.target);
    if (!target) throw new Error('Missing interaction target: ' + step.target);
    state.actionDone = false;
    if (step.type === 'use') { g.use(target); state.actionDone = true; }
    else if (step.type === 'say') {
      const { known } = await import(new URL('js/lang.js', location.href));
      if (!known.has(step.word)) throw new Error('Unknown word: ' + step.word);
      g.sayWord(step.word, target).then(() => { state.actionDone = true; }, e => state.errors.push(e.message));
    } else if (step.type === 'give') {
      const index = [...new Set(g.sim.inv)].indexOf(step.item);
      if (index < 0) throw new Error('Missing gift: ' + step.item);
      g.sayTarget = target;
      ui.onGive().then(() => { state.actionDone = true; }, e => state.errors.push(e.message));
      return { index, target: target.label };
    } else throw new Error('Unknown route action: ' + step.type);
  }, step);
  if (gift) {
    await page.locator('#sayMenu').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.locator('#sayMenu .head').textContent(), `Give to ${gift.target}`);
    await page.locator('#sayMenu .list button').nth(gift.index).click();
  }
  await settled(page, place);
  const response = await page.evaluate(before => ({
    nodes: window.__branch.nodes.slice(before.nodes), lines: window.__branch.lines.slice(before.lines),
  }), before);
  assert.ok(response.nodes.length || response.lines.length, `${step.type}:${step.target} produced no response`);
  if (step.line) assert.ok(response.lines.includes(step.line), `${step.type}:${step.target} missing line ${JSON.stringify(step.line)}; saw ${JSON.stringify(response.lines)}`);
  await page.evaluate(receipt => window.__branch.actions.push(receipt), { ...step, ...response });
}

function expectNodes(actual, expected, label) {
  let next = 0;
  for (const node of actual) if (node === expected[next]) next++;
  assert.equal(next, expected.length, `${label}: missing ordered node ${expected[next]}; saw ${actual.join(', ')}`);
}

export async function runRoute(browser, route, { base, viewport, who = {} }) {
  const started = Date.now();
  let opened, closing = false;
  const blocked = [], priorNodes = [], priorChoices = [];
  try {
    for (const word of route.expect.known || []) assert.ok(!(route.seed.known || []).includes(word),
      `Expected learned word ${word} is already in seed.known`);
    const saved = seedSave(route.seed, who);
    opened = await openGame(browser, { mode: 'title', viewport, url: `${base}/index.html?q=0${who.query || ''}`,
      beforeNavigate: async (page, context) => {
        await context.route('**/*', scopedRoute({ publicOnly: true, isClosing: () => closing, onFailure: message => blocked.push(message) }));
        await page.addInitScript(saved => {
          if (!sessionStorage.getItem('branch-seeded')) {
            localStorage.setItem('amakawa-day1-save', JSON.stringify(saved));
            localStorage.setItem('amakawa-settings', JSON.stringify({ textSpeed: 'instant', voiceOn: false, reduceMotion: true, privateMode: false }));
            sessionStorage.setItem('branch-seeded', '1');
          }
        }, saved);
      } });
    const { page } = opened;
    await installDriver(page, route);
    await continueSave(page);
    if (route.resumeAt || route.resumeInDelivery) {
      if (route.resumeAt) await page.waitForFunction(node => window.__game.runner.currentNode === node && !!window.__game.ui._advance,
        route.resumeAt, { timeout: 45000 });
      else await page.waitForFunction(() => document.querySelector('iframe[title="Kotodama at B2"]')?.contentDocument?.querySelector('.hint-glow'), null, { timeout: 45000 });
      const checkpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('amakawa-day1-save')));
      if (route.resumeAt) assert.equal(checkpoint.runner.execution.frames.at(-1).node, route.resumeAt);
      else assert.ok(!checkpoint.flags.d5_delivery_seen, 'Undelivered session must remain unseen');
      const first = await page.evaluate(() => ({ nodes: window.__branch.nodes, choices: window.__branch.choices }));
      priorNodes.push(...first.nodes); priorChoices.push(...first.choices);
      await waitForGame(page, 45000, () => page.reload(), 'title');
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('amakawa-day1-save'))), checkpoint,
        'Title must preserve the actual mid-day checkpoint');
      await installDriver(page, route, true, priorChoices.length);
      await continueSave(page);
      await settled(page, route.seed.place);
      const after = await page.evaluate(() => ({ inv: window.__game.sim.inv, yen: window.__game.sim.yen, nodes: window.__branch.nodes }));
      if (route.resumeAt) assert.equal(after.nodes[0], route.resumeAt, 'Continue must resume at the unfinished node');
      assert.deepEqual(after.inv, checkpoint.inv, 'Continue must preserve inventory');
      assert.equal(after.yen, checkpoint.yen + (route.resumeYenDelta || 0), 'Continue must apply only the remaining payment');
    } else await settled(page, route.startAt || route.seed.place); // (startAt: where the opening scene ends up)
    if (route.calendarDay) await page.evaluate(async day => {
      const g = window.__game;
      g.sim.day = day; g.flagsRef.day = day;
      await g.hooks.day4Setup();
    }, route.calendarDay);
    for (const step of route.actions || []) await action(page, step, step.settleAt || route.seed.place);
    if (route.expect.ended) {
      await page.locator('#end.in .again').waitFor({ state: 'visible', timeout: 5000 });
      if ((route.seed.day || 1) === 1) {
        assert.equal(await page.locator('#end h2').textContent(), 'Day one');
        assert.match(await page.locator('#end .ticket').textContent(), /Repair request #2/i);
      } else assert.equal(await page.locator('#end h2').textContent(), DAY_NAMES[route.seed.day]);
      assert.equal(await page.locator('#end .again').textContent(), 'Back to title');
    }
    const state = await page.evaluate(async () => {
      const { flags } = await import(new URL('js/narrative/state.js', location.href));
      const { known } = await import(new URL('js/lang.js', location.href));
      const g = window.__game;
      return { ...window.__branch, flags: { ...flags }, known: [...known], inv: [...g.sim.inv], yen: g.sim.yen,
        period: g.sim.period, bonds: { ...g.sim.bonds }, ended: !!window.__ended, recovery: g.runner.recoveryError, mc: g.mc?.id, cast: g.cast };
    });
    expectNodes(priorNodes, route.expect.beforeReloadNodes || [], 'Before reload');
    assert.deepEqual([...opened.errors, ...blocked, ...state.errors], []);
    assert.ok(!state.recovery, state.recovery);
    if (who.mc) assert.equal(state.mc, who.mc, 'Protagonist');
    if (who.cast) assert.deepEqual(state.cast.roles, who.cast.roles, 'Cast');
    assert.deepEqual(state.queue, [], 'Route left choices unexercised');
    expectNodes(state.nodes, route.expect.nodes || [], route.resumeAt ? 'After reload' : 'Route');
    for (const [key, value] of Object.entries(route.expect.flags || {})) {
      if (value === false) assert.ok(!state.flags[key], `Expected ${key} falsy, got ${state.flags[key]}`);
      else assert.equal(state.flags[key], value, `Flag ${key}`);
    }
    for (const word of route.expect.known || []) assert.ok(state.known.includes(word), 'Missing learned word ' + word);
    for (const key of ['inv', 'yen', 'period', 'bonds', 'ended']) if (key in route.expect) assert.deepEqual(state[key], route.expect[key], key);
    return { id: route.id, pass: true, seconds: (Date.now() - started) / 1000, choices: [...priorChoices, ...state.choices], nodes: state.nodes, actions: state.actions,
      ...(route.resumeAt ? { beforeReload: { nodes: priorNodes, choices: priorChoices } } : {}) };
  } catch (error) {
    let state;
    try { state = await opened?.page.evaluate(() => ({ node: window.__game?.runner.currentNode, trace: window.__branch, goal: window.__game?.ui.goalText })); } catch {}
    return { id: route.id, pass: false, seconds: (Date.now() - started) / 1000, error: error.message, pageErrors: opened?.errors || [], state };
  } finally {
    closing = true;
    if (opened) { await opened.page.evaluate(() => clearInterval(window.__branch?.timer)).catch(() => {}); await opened.close(); }
  }
}
