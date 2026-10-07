// The same eligibility drives the physical door, route extraction and map status.
export const BAKERY_FIRST_DAY = 3;
export const BAKERY_HOURS = ['morning', 'lunch', 'afternoon'];
export const bakeryOpen = (day, period) => day >= BAKERY_FIRST_DAY && BAKERY_HOURS.includes(period);
export const BAKERY_OPEN = "day >= 3 && (period == 'morning' || period == 'lunch' || period == 'afternoon')";
