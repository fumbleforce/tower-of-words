export const weekdayOf=e=>((e+3)%7+7)%7,isWeekend=e=>[0,6].includes(weekdayOf(e)),isContinuing=e=>Number.isSafeInteger(e)&&e>5;
