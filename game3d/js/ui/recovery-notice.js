export function showRecoveryNotice(message) {
  const notice = document.createElement('dialog');
  notice.className = 'save-recovery';
  notice.setAttribute('role', 'alertdialog');
  notice.setAttribute('aria-label', 'Unable to resume scene');
  notice.textContent = `${message} Your last save is preserved. `;
  const back = document.createElement('button');
  back.textContent = 'Return to title';
  back.addEventListener('click', () => location.reload());
  notice.append(back);
  notice.addEventListener('cancel', (event) => event.preventDefault());
  document.body.append(notice);
  notice.showModal();
}
