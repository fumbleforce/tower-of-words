import { direction, speakers, sayFallbacks, fallbackNodes } from './shared.js';
export default {
  speakers,
  start: 'd2_platform',
  on: {
    'talk:door_test': [{ if: '!d2_ticket_done', node: 'd2_check' }, 'd2_checked_again'],
    'talk:mio': [{ if: '!d2_ticket_done', node: 'd2_mio_before' }, 'd2_mio_after'],
    'idle:mio': 'd2_mio_idle',
    'talk:station_exit': 'd2_to_gate',
    'zone:platform_exit': 'd2_to_gate',
    ...sayFallbacks,
  },
  show: { door_test: 'true' },
  goal: { door_test: '!d2_ticket_done', station_exit: 'd2_ticket_done' },
  nodes: {
    d2_platform: [
      { if: '!d2_ticket_done && (lunch_mio || mio_warm >= 2)', then: [{ set: 'd2_mio_here' }, { do: 'stationSetup', companion: true }],
        else: [{ unset: 'd2_mio_here' }, { do: 'stationSetup', companion: false }] },
      { if: '!d2_station_seen', then: [
        { set: 'd2_station_seen' },
        { if: 'd2_mio_here', then: [
          { say: 'mio', emo: 'tired', text: 'Morning. We can use this one while it’s between runs.' },
          { say: 'mio', emo: 'low', text: 'I told them it was the sensor, so, um... I’d quite like it to be the sensor.' },
        ], else: [
          { say: 'miotext', text: 'that car is between runs, you can test it' },
          { say: 'miotext', text: 'emi can order a sensor if you confirm it’s broken' },
        ] },
      ] },
      { if: 'd2_ticket_done', then: direction('station_exit', 'station_exit', 'station_exit', 'station_exit'),
        else: [{ do: 'goal', text: 'Run the door check.', at: 'door_test' }] },
    ],
    d2_check: [
      { do: 'ticket', start: 'T-0002' },
      { if: '!d2_checked', then: [
        { do: 'doorTest' }, { set: 'd2_checked' },
        { say: 'eric', emo: 'tired', text: 'The sensor passes.' },
        { if: 'd2_mio_here', then: [{ say: 'mio', emo: 'low', text: 'Mm. So it isn’t the thing I told them.' }] },
      ] },
      { go: 'd2_report' },
    ],
    d2_report: [
      { choice: [
        { text: 'Report: “The sensor needs replacing.”', go: 'd2_order_sensor' },
        { text: 'Report: “The sensor passes. No replacement needed.”', go: 'd2_keep_sensor' },
        { text: 'Close the doors and try 待って (matte) again.', go: 'd2_voice_test', if: '!d2_voice_tested' },
      ] },
    ],
    d2_voice_test: [
      { do: 'doorsClose', to: 0.35, ms: 1800 },
      { say: 'eric', emo: 'hesitant', text: '{matte}.' },
      { do: 'doorsHold', kotodama: true },
      { if: 'd2_mio_here', then: [
        { say: 'mio', emo: 'low', text: 'I was standing right here. You didn’t touch anything.' },
        { say: 'mio', emo: 'dry', text: 'Okay, let them go before somebody comes over.' },
      ], else: ['> The motor hums against the held doors.'] },
      { say: 'eric', emo: 'hesitant', text: '{ugoite}.' },
      { do: 'doorsOpen' }, { set: 'd2_voice_tested' }, { go: 'd2_report' },
    ],
    d2_order_sensor: [{ set: 'd2_order_sensor' }, { go: 'd2_submit' }],
    d2_keep_sensor: [{ unset: 'd2_order_sensor' }, { go: 'd2_submit' }],
    d2_submit: [
      { do: 'ticket', start: 'T-0002' },
      { set: 'd2_ticket_done' },
      '> Report sent to B2.',
      { if: 'd2_mio_here', then: [
        { if: 'd2_order_sensor', then: [{ say: 'mio', emo: 'low', text: 'Okay. Thanks for going along with it. I still want to know what happened yesterday, though.' }],
          else: [{ say: 'mio', emo: 'dry', text: 'Mm. I’ll have to tell them I got it wrong, then. I still don’t know what I should have said.' }] },
        { say: 'mio', emo: 'tired', text: 'I’m going down to B2. See you there.' },
        { do: 'stationSetup', state: 'depart', companion: false }, { unset: 'd2_mio_here' },
      ], else: [
        { if: 'd2_order_sensor', then: [{ say: 'miotext', text: 'saw the report, thanks for backing me up' }],
          else: [{ say: 'miotext', text: 'saw the report, i’ll tell the station i got it wrong' }] },
      ] },
      { do: 'goal', text: 'Tell Emi what the check found.', at: 'station_exit' }, { do: 'save' },
    ],
    d2_checked_again: [{ say: 'eric', emo: 'tired', text: 'I’ve sent the report.' }],
    d2_mio_before: [{ say: 'mio', emo: 'dry', text: 'The test button is right there. I’ll watch.' }],
    d2_mio_after: [{ say: 'mio', emo: 'tired', text: 'I’m going downstairs. See you in a minute.' }],
    d2_mio_idle: [{ say: 'mio', emo: 'tired', text: 'I haven’t even had coffee yet.' }],
    d2_to_gate: [{ do: 'trip', to: 'gate' }],
    ...fallbackNodes,
  },
};
