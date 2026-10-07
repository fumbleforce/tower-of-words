// One menu owns prices, display names and the physical dish used by service and dining.
export const CANTEEN_MEALS = Object.freeze({
  curry: Object.freeze({
    name: 'Curry rice',
    ja: 'カレー',
    price: 420,
    dish: 'curry',
  }),
  vegetables: Object.freeze({
    name: 'Rice and vegetables',
    ja: '野菜定食',
    price: 480,
    dish: 'vegetables',
  }),
});
export const canteenServing = (_day, period) => period === 'lunch';
export const CANTEEN_SERVING = 'period_lunch';
