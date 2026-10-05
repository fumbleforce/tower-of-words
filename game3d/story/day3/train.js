import { place, goal } from './shared.js';
export default place(
  { gate: ['talk:station_exit', 'zone:platform_exit'] },
  {
    on: { 'talk:door_test': 'd3_signoff', 'talk:guard': 'd3_signoff' },
    nodes: {
      d3_arrive: [
        { do: 'stationSetup', companion: false }, { do: 'day3Setup' },
        { if: 'd3_signoff_walk', then: [{ unset: 'd3_signoff_walk' }, { go: 'd3_signoff' }] },
        { if: "period == 'morning' && d2_ticket_done && ticket_T0002 != 'done'", then: [
          { do: 'goal', text: 'Ask the guard to witness the final door check.', at: 'door_test' },
        ], else: goal('station_exit') },
      ],
      d3_signoff: [
        { if: "ticket_T0002 == 'done'", then: [
          { say: 'eric', emo: 'warm', text: 'The station has signed it off.' }, { end: true },
        ] },
        { if: '!d2_ticket_done', then: [
          { say: 'eric', emo: 'tired', text: 'They need the test report before they can sign this off.' }, { end: true },
        ] },
        { if: "period != 'morning'", then: [
          { say: 'eric', emo: 'tired', text: 'I’ll ask the guard in the morning.' }, { end: true },
        ] },
        { do: 'cam', on: 'guard', zoom: 1.2 },
        { do: 'gesture', who: 'guard', kind: 'point', to: 'door_test' },
        { if: 'd2_order_sensor', then: [
          { say: 'guard', overheard: true, emo: 'polite', text: 'センサーは、新しいのに交換しました。確認をお願いします。', clear: ['センサー'] },
          { say: 'eric', emo: 'warm', text: 'So the new sensor’s in. Let’s see it work.' },
        ], else: [
          { say: 'guard', overheard: true, emo: 'polite', text: 'センサーは、そのままです。もう一度、確認をお願いします。', clear: ['センサー'] },
          { say: 'eric', emo: 'curious', text: 'Same old sensor, then. Let’s see if it behaves this time.' },
        ] },
        { choice: [
          { text: 'Run the final check.', go: 'd3_signoff_test' },
          { text: 'Do the check another morning.', go: 'd3_signoff_later' },
        ] },
      ],
      d3_signoff_test: [
        { do: 'ticket', start: 'T-0002' },
        { do: 'stationSignoff', state: 'test' },
        { say: 'eric', emo: 'warm', text: 'There. It stopped short, the way it’s meant to.' },
        { do: 'stationSignoff', state: 'retrieve' },
        { say: 'guard', overheard: true, emo: 'polite', text: '道具は、全部出しました。閉めます。' },
        { do: 'stationSignoff', state: 'close' },
        { say: 'guard', overheard: true, emo: 'puzzled', text: 'あ、時刻を先に書いてしまいました。' },
        { do: 'stationSignoff', state: 'sign' },
        { set: 'd3_station_done' }, { do: 'ticket', close: 'T-0002' },
        { say: 'guard', overheard: true, emo: 'warm', text: '確認しました。お疲れさまでした。' },
        { do: 'bow', who: 'guard', depth: 'deep' },
        { do: 'cam', back: true },
        { do: 'phone', who: 'eric', state: 'buzz' },
        { if: 'd2_order_sensor', then: [
          { say: 'miotext', text: 'got the sign-off\nnew sensor fitted and working, then' },
          { say: 'miotext', text: 'thanks for going back' },
        ], else: [
          { say: 'miotext', text: 'got the sign-off\nso the old sensor still passes' },
          { say: 'miotext', text: 'still doesn’t explain thursday\nbut the station’s happy' },
        ] },
        { do: 'phone', who: 'eric', state: 'away' },
        { do: 'stationSignoff', state: 'leave' }, { do: 'save' }, ...goal('station_exit'),
      ],
      d3_signoff_later: [{ do: 'cam', back: true }, ...goal('station_exit')],
    },
  },
);
