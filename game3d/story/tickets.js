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
  'T-0005': {
    title: 'Court display counts twice', from: 'Tennis player at the sports courts', pay: 1500,
    text: 'One press adds two points. We can play while it waits, but please check the button.\n\nI can test it with you at the courts on Sunday afternoon or evening.',
  },
  'T-0006': {
    title: 'Gym desk fan has stopped', from: 'Gym attendant', pay: 1000,
    text: 'The desk fan will not start. Its starter lever is sticking.\n\nPlease check that it turns all the way and back. The desk is staffed during the day; any day is fine.',
  },
  'T-0007': {
    title: 'Visitor label cuts off the name', from: 'Reception', pay: 1500,
    text: 'The visitor-label printer cuts off the end of a long name. Please check the saved format.\n\nReception can confirm a full printed name on weekday mornings or afternoons.',
  },
  'T-0008': {
    title: 'Karaoke selector skips past songs', from: 'kenji', pay: 2000,
    text: 'The selector keeps going past the song I want. I am checking the upstairs booth on Monday at lunch.\n\nPlease get it to stay on one row. Another Monday is fine if you are busy.',
  },
};
