// Only free days expose waiting. Introductory workdays advance through authored scenes.
export function timeChoices({ day, period, started, busy = '', ended = false }, periods) {
  const reason = ended
    ? 'This day has ended.'
    : busy === 'talking'
      ? 'Finish the conversation first.'
      : busy
        ? 'Wait until this moment is over.'
        : day < 3
          ? 'Time moves with your current goal today.'
          : !started
            ? 'Read your morning messages first.'
            : period === 'evening'
              ? 'It is already evening. Sleep in your room to end the day.'
              : '';
  const index = periods.indexOf(period);
  return { reason, targets: reason || index < 0 ? [] : periods.slice(index + 1) };
}
