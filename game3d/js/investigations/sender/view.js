import { pendingItems, partialDelivery } from './model.js';

const CSS = `
.sender-inspect{position:fixed;inset:0;z-index:80;display:grid;place-items:center;background:#070d18b8;color:#ecf1fa;font:16px system-ui,sans-serif;padding:18px;box-sizing:border-box}
.sender-device{width:min(760px,100%);max-height:94dvh;overflow:auto;border:3px solid #465063;border-radius:12px;background:#101925;box-shadow:0 18px 65px #0009}
.sender-head{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #3c4759;background:#1b2637;position:sticky;top:0;z-index:1}
.sender-head h2{font-size:18px;margin:0;flex:1}.sender-led{width:9px;height:9px;border-radius:50%;background:#8ee4a2}
.sender-inspect button,.sender-inspect select{font:inherit;color:inherit;background:#263348;border:1px solid #637188;border-radius:5px;min-height:44px;padding:8px 12px;cursor:pointer}
.sender-inspect button:hover{background:#354764}.sender-inspect button:focus-visible,.sender-inspect select:focus-visible{outline:3px solid #99bdff;outline-offset:2px}
.sender-inspect button:disabled{opacity:.46;cursor:default}.sender-inspect button[aria-pressed=true]{background:#344f75;border-color:#b8d2ff;box-shadow:inset 4px 0 #b8d2ff}
.sender-body{padding:16px 18px}.sender-runs{display:grid;grid-template-columns:1fr 1fr;gap:14px}.sender-run{border:1px solid #465369;border-radius:5px;overflow:hidden}
.sender-run h3{font-size:14px;font-weight:500;margin:0;padding:9px 12px;background:#202d40;display:flex;align-items:center;justify-content:space-between;gap:8px}.sender-run select{min-height:36px;padding:3px 7px;max-width:145px}
.sender-rows{display:grid;gap:5px;padding:8px;min-height:139px;align-content:start}.sender-row{display:flex;justify-content:space-between;gap:12px;text-align:left}.sender-row strong{font:600 18px ui-monospace,monospace}.sender-break{padding:9px;color:#cbd6e8;border-top:1px dashed #637188;font-size:14px}
.sender-status{min-height:24px;margin:12px 0;color:#cbd6e8;font-size:14px}.sender-status[data-pinned=true]{color:#c6dfad}.sender-queue{display:grid;grid-template-columns:1fr 1fr 1fr;border-top:1px solid #465369;border-bottom:1px solid #465369;padding:12px 0;gap:12px}
.sender-queue h3{font-size:13px;font-weight:500;color:#afbdd0;margin:0 0 9px}.sender-items{display:flex;gap:6px;flex-wrap:wrap;min-height:44px;align-items:center}.sender-items .sender-number{font:600 18px ui-monospace,monospace;padding:8px}.sender-empty{color:#8190a6;padding:8px}
.sender-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:14px}.sender-primary{background:#315276!important;border-color:#8eacd3!important}.sender-footer{color:#acbcd1;font-size:13px;line-height:1.5;margin:12px 0 0}.sender-note{border-left:3px solid #a9c793;padding:6px 10px;margin-top:12px;font-size:14px;color:#d8e7cb}
@media(max-width:540px){.sender-inspect{padding:7px}.sender-device{max-height:97dvh}.sender-head{padding:10px 12px}.sender-body{padding:10px 12px}.sender-runs{grid-template-columns:1fr;gap:8px}.sender-run h3{padding:6px 10px}.sender-rows{min-height:0;gap:4px;padding:6px}.sender-row{min-height:42px!important;padding:7px 10px!important}.sender-break{padding:6px 10px}.sender-status{margin:8px 0}.sender-queue{padding:9px 0;gap:8px;grid-template-columns:1.2fr 1fr 1fr}.sender-items{gap:2px}.sender-items button{padding:6px 9px}.sender-actions{margin-top:10px}.sender-footer{margin-top:8px}.sender-note{margin-top:8px}}
`;
const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

// A magnified view of the physical console. It only dispatches explicit player input.
export function senderView({
  read,
  act,
  leave,
  interpret,
  canInterpret = () => false,
  liveOnly = false,
  parent = document.body,
}) {
  const previousFocus = document.activeElement;
  const overlay = element('div', 'sender-inspect');
  const style = element('style');
  style.textContent = CSS;
  const device = element('section', 'sender-device');
  device.setAttribute('role', 'dialog');
  device.setAttribute('aria-modal', 'true');
  device.setAttribute('aria-label', liveOnly ? 'Timesheet sender' : 'Sender console');
  overlay.append(style, device);
  parent.append(overlay);
  let earlier = read().attempts.at(-2).id;
  let stopped = false;
  function close() {
    if (stopped) return;
    stopped = true;
    document.removeEventListener('keydown', keyboard);
    overlay.remove();
    previousFocus?.focus?.();
  }
  function button(text, action, disabled = false, className = '') {
    const node = element('button', className, text);
    node.type = 'button';
    node.disabled = disabled;
    node.onclick = action;
    return node;
  }
  function send(action) {
    act(action);
    if (!stopped) render();
  }
  function runPanel(run, latest) {
    const panel = element('section', 'sender-run');
    const heading = element('h3', '', latest ? 'Latest attempt' : 'Earlier output');
    if (!latest) {
      const select = element('select');
      select.setAttribute('aria-label', 'Earlier attempt');
      for (const attempt of read().attempts.slice(0, -1)) {
        const option = element('option', '', `Attempt ${attempt.id}`);
        option.value = attempt.id;
        option.selected = attempt.id === earlier;
        select.append(option);
      }
      select.onchange = () => {
        earlier = Number(select.value);
        render();
      };
      heading.append(select);
    } else heading.append(element('span', '', `#${run.id}`));
    const rows = element('div', 'sender-rows');
    for (const row of run.rows) {
      if (row.status === 'restart') rows.append(element('div', 'sender-break', '↻ Restart'));
      else {
        const rowButton = button('', () => send({ type: 'select', row: row.id }), false, 'sender-row');
        rowButton.dataset.row = row.id;
        rowButton.setAttribute('aria-label', `Attempt ${run.id}, item ${row.item}, ${row.status}`);
        rowButton.setAttribute('aria-pressed', String(read().selected.includes(row.id)));
        rowButton.append(
          element('strong', '', row.item),
          element('span', '', row.status === 'acknowledged' ? 'Acknowledged' : 'Started'),
        );
        rows.append(rowButton);
      }
    }
    if (!run.rows.length) rows.append(element('div', 'sender-break', 'Ready'));
    panel.append(heading, rows);
    return panel;
  }
  function queueColumn(label, ids, interactive = false) {
    const column = element('section');
    const items = element('div', 'sender-items');
    for (const id of ids) {
      if (interactive) {
        const hold = button(String(id), () => send({ type: 'hold', item: id }), !read().pinned || !!read().active);
        hold.setAttribute('aria-label', `Hold item ${id}`);
        items.append(hold);
      } else items.append(element('span', 'sender-number', id));
    }
    if (!ids.length) items.append(element('span', 'sender-empty', '—'));
    column.append(element('h3', '', label), items);
    return column;
  }
  function render() {
    const state = read();
    const focusRow = document.activeElement?.dataset?.row;
    const scroll = device.scrollTop;
    device.replaceChildren();
    const head = element('header', 'sender-head');
    head.append(
      element('span', 'sender-led'),
      element('h2', '', liveOnly ? 'Timesheet sender' : 'Sender console'),
      button('Leave', () => {
        close();
        leave();
      }),
    );
    const body = element('div', 'sender-body');
    const runs = element('div', 'sender-runs');
    runs.append(
      runPanel(state.attempts.find((run) => run.id === earlier) || state.attempts[0], false),
      runPanel(state.attempts.at(-1), true),
    );
    const status = element(
      'p',
      'sender-status',
      state.pinned
        ? `Pinned: item ${state.pinned.item} started in both attempts.`
        : state.selected.length === 2
          ? 'Different rows. Choose a row from each attempt.'
          : 'Select a row in each attempt to compare.',
    );
    status.dataset.pinned = String(!!state.pinned);
    status.setAttribute('role', 'status');
    const queue = element('div', 'sender-queue');
    queue.append(
      queueColumn(liveOnly ? 'Pending' : 'Pending · tap to hold', pendingItems(state), !liveOnly),
      queueColumn('Held · one slot', state.held === null ? [] : [state.held]),
      queueColumn('Acknowledged', state.acknowledged),
    );
    const actions = element('div', 'sender-actions');
    if (state.active) actions.append(button(`Sending ${state.active.item}…`, () => {}, true, 'sender-primary'));
    else
      actions.append(
        button(
          'Retry pending',
          () => send({ type: 'retry' }),
          !state.pinned || !pendingItems(state).length,
          'sender-primary',
        ),
      );
    actions.append(button('Return held item', () => send({ type: 'release' }), state.held === null || !!state.active));
    if (canInterpret())
      actions.append(
        button('Ask Mori about “mada”', () => {
          close();
          interpret();
        }),
      );
    if (liveOnly) body.append(element('p', 'sender-status', 'On'), queue);
    else body.append(runs, status, queue, actions);
    if (partialDelivery(state)) body.append(element('div', 'sender-note', '25 · original retained'));
    body.append(
      element(
        'p',
        'sender-footer',
        liveOnly
          ? 'Live queue · previous output is on the console in the machine room.'
          : state.active
            ? 'Output is retained while the pending items are sent.'
            : 'Holding another item returns the current held item to pending.',
      ),
    );
    device.append(head, body);
    device.scrollTop = scroll;
    if (focusRow) device.querySelector(`[data-row="${focusRow}"]`)?.focus();
  }
  function keyboard(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      leave();
    }
    if (event.key !== 'Tab') return;
    const focusable = [...device.querySelectorAll('button:not(:disabled),select')];
    const first = focusable[0],
      last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  document.addEventListener('keydown', keyboard);
  render();
  device.querySelector('button')?.focus();
  return { close, render };
}
