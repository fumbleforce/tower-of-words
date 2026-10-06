// The existing tap/keyboard dialogue control presents written text as a compact translated paper, without a speaker.
let styled = false;
export async function readNote(ui, text) {
  if (!styled) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('../../css/flavor-finds.css', import.meta.url).href;
    document.head.appendChild(link);
    styled = true;
  }
  const panel = document.querySelector('#talk');
  panel.classList.add('flavor-written');
  try {
    await ui.say(null, text);
  } finally {
    panel.classList.remove('flavor-written');
  }
}
