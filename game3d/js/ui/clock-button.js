// Shared clock markup and label update, kept beside its time menu.
export const clockHTML = `<button id="clock" class="hchip" type="button" aria-haspopup="dialog" aria-expanded="false" hidden><span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg></span><span class="d"></span><span class="p"></span><span class="clock-more" aria-hidden="true">⌄</span></button>`;
export function updateClock(date, period) {
  const c = document.getElementById('clock');
  c.hidden = false;
  c.querySelector('.d').textContent = date;
  c.querySelector('.p').textContent = period;
  c.setAttribute('aria-label', `${date}, ${period}. Time controls`);
}
