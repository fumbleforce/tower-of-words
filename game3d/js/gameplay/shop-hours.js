// The same eligibility drives the physical door, route extraction and map status.
export const BAKERY_FIRST_DAY = 3;
export const BAKERY_HOURS = ['morning', 'lunch', 'afternoon'];
export const bakeryOpen = (day, period) => day >= BAKERY_FIRST_DAY && BAKERY_HOURS.includes(period);
export const BAKERY_OPEN = "day >= 3 && (period == 'morning' || period == 'lunch' || period == 'afternoon')";

export const KONBINI_FIRST_DAY = 3;
export const KONBINI_HOURS = ['morning', 'lunch', 'afternoon', 'evening'];
export const konbiniOpen = (day, period) => day >= KONBINI_FIRST_DAY && KONBINI_HOURS.includes(period);
export const KONBINI_OPEN =
  "day >= 3 && (period == 'morning' || period == 'lunch' || period == 'afternoon' || period == 'evening')";
