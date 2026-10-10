// Opening day is Thursday, 1 October. Later schedules use weekdays, never a
// recycled opening-day number; story progress remains in the saved flags.
export const weekdayOf = (day) => (((day + 3) % 7) + 7) % 7;
export const isWeekend = (day) => [0, 6].includes(weekdayOf(day));
export const isContinuing = (day) => Number.isSafeInteger(day) && day > 5;
