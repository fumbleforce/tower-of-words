// Shared runtime declaration; tooling imports this without DOM or renderer side effects.
export const ITEMS = {
  milk: { name: 'Milk carton', price: 150, giftable: false, document: true },
  riceball: { name: 'Salted rice ball', price: 130, giftable: false, document: true },
  curry_bread: { name: 'Curry bread', price: 180, giftable: false },
  butter_roll: { name: 'Butter roll', price: 120, giftable: false },
  island_directory: { name: 'Island directory', price: 0, document: true, giftable: false },
  coffee: { name: 'Canned coffee', price: 120 },
  tea: { name: 'Royal milk tea', price: 130 },
  melon: { name: 'Melon soda', price: 130 },
  cornsoup: { name: 'Hot corn soup', price: 130 },
};
