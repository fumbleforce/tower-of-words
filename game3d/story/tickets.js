// Repair requests shown by both computers. Day 2: docs/game/stories/day2/service.md; day 3: day3/README.md.
export default {
  'T-0001': {
    title: 'B2 copier eats paper',
    from: 'mori',
    text: 'The {コピー機|kopiiki|copier} on B2 eats paper during printing. Please check it before we order another one.\n\nOpened 1 April 1996. Closed by Mio after {mc.name}’s test copies came through normally.',
    pay: 3000,
    done: 'ticket_closed',
  },
  'T-0002': {
    title: 'Train doors at Honsha',
    pay: 5000,
    from: 'Honsha station, via Mio',
    text: 'The train {ドア|doa|doors} at Honsha stopped while closing. Please test the sensor before Emi orders a replacement.\n\nLeave this open until the station confirms the doors are working.',
  },
  'T-0003': {
    title: 'Station monitor loses picture',
    from: 'The guard, Honsha station',
    pay: 1000,
    text: 'The desk {モニター|monitaa|monitor} loses its picture when I turn it towards a visitor. Please check the connection.\n\nI can test it with you at the station desk in the morning. Any morning is fine.',
  },
  'T-0004': {
    title: 'Gym booking terminal frozen',
    from: 'Gym attendant',
    pay: 1500,
    text: 'The {予約|yoyaku|booking} terminal on the gym’s reception counter froze this morning, and I can’t get today’s bookings printed out.\n\nI’m at the counter all day, so come by whenever suits you. It can wait.',
  },
};
