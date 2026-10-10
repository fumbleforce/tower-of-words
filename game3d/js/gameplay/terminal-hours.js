// The waiting room is a local shelter. These hours do not imply ferry departures or ticket sales.
export const TERMINAL_PERIODS = ['early', 'morning', 'lunch', 'afternoon', 'evening'];
export const TERMINAL_STAFF_PERIODS = ['morning', 'lunch', 'afternoon'];
export const terminalOpen = (_day, period) => TERMINAL_PERIODS.includes(period);
export const terminalStaffed = (_day, period) => TERMINAL_STAFF_PERIODS.includes(period);
export const TERMINAL_OPEN = TERMINAL_PERIODS.map((p) => 'period_' + p).join(' || ');
