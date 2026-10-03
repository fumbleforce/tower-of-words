// Repair requests shown by both computers. Their story effects are in docs/game/stories/day2/service.md.
export default {
  'T-0001': {
    title: 'B2 copier eats paper',
    from: 'mori',
    text: 'The {コピー機|kopiiki|copier} on B2 eats paper during printing. Please check it before we order another one.\n\nOpened 1 April 1996. Closed by Mio after Eric’s test copies came through normally.',
    pay: 3000,
    done: 'ticket_closed',
  },
  'T-0002': {
    title: 'Train doors at Honsha',
    pay: 5000,
    from: 'Honsha station, via Mio',
    text: 'The train {ドア|doa|doors} at Honsha stopped while closing. Please test the sensor before Emi orders a replacement.\n\nLeave this open until the station confirms the doors are working.',
  },
};
