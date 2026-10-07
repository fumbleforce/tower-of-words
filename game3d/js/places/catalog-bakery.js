export const BAKERY_DETAILS = {
  things: {
    bakery_exit: { label: 'Shopping street', kind: 'thing', verb: 'Go out' },
    bread_rack: { label: 'Bread trays', kind: 'thing', verb: 'Choose' },
    bakery_clerk: { label: 'Bakery clerk', kind: 'person' },
    bakery_seat: { label: 'Window seat', kind: 'thing', verb: 'Sit' },
  },
  spots: ['bakery_in', 'bread_rack', 'checkout', 'window'],
  seats: ['bakery_seat'],
  people: ['bakery_clerk'],
  zones: [],
  nooks: [],
  hooks: ['bakeryShop'],
};
