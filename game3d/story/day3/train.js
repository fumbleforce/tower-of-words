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
        { say: 'guard', emo: 'polite', text: 'この車両は点検用です。発車しません。', en: 'This carriage is out of service for the check. It won’t depart.' },
        { if: 'd2_order_sensor', then: [
          { say: 'guard', emo: 'polite', text: 'センサーは交換しました。確認をお願いします。', en: 'Maintenance fitted the replacement sensor. Please check it.' },
        ], else: [
          { say: 'guard', emo: 'polite', text: 'センサーはそのままです。もう一度、確認をお願いします。', en: 'The original sensor is still fitted. Please check it once more.' },
        ] },
        { choice: [
          { text: 'Run the final check.', go: 'd3_signoff_test' },
          { text: 'Do the check another morning.', go: 'd3_signoff_later' },
        ] },
      ],
      d3_signoff_test: [
        { do: 'ticket', start: 'T-0002' },
        { do: 'stationSignoff', state: 'test' },
        { say: 'eric', emo: 'warm', text: 'It stopped where it should.' },
        { do: 'stationSignoff', state: 'retrieve' },
        { say: 'guard', emo: 'polite', text: '道具は全部出しました。最後に閉めます。', en: 'All the equipment is clear. I’ll close the doors now.' },
        { do: 'stationSignoff', state: 'close' },
        { say: 'guard', emo: 'puzzled', text: '時刻を先に書いてしまいました。一分、直します。', en: 'I wrote the time down too early. Let me change that by a minute.' },
        { do: 'stationSignoff', state: 'sign' },
        { set: 'd3_station_done' }, { do: 'ticket', close: 'T-0002' },
        { say: 'guard', emo: 'polite', text: '確認しました。お疲れさまでした。', en: 'Signed off. Thank you for your work.' },
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
