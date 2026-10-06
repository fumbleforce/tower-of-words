export default {
  speakers: { canteen_worker: { name: 'Canteen worker' } },
  start: 'arrive',
  on: { 'talk:canteen_worker': 'room_worker', 'talk:canteen_exit': 'to_plaza', 'talk:canteen_seat_w': 'sit_w', 'talk:canteen_seat_e': 'sit_e' },
  nodes: {

  room_worker: [
    { do: 'roomWorker', state: 'frame' },
    { if: 'evening_canteen_helped && !room_worker_thanked', then: [
      { say: 'canteen_worker', overheard: true, emo: 'warm', text: 'あ、椅子を運んでくれた方ですね。ありがとうございました。' },
      { do: 'bow', who: 'canteen_worker', depth: 'small' },
      { set: 'room_worker_thanked' },
    ], else: [{ say: 'canteen_worker', overheard: true, emo: 'polite', text: 'はい、どうぞ。' }] },
    { choice: [
      { text: 'Point to the water dispenser. “Water?”', go: 'room_water' },
      { text: 'Point to the tray-return trolley.', go: 'room_trays' },
      { text: 'Ask about closing up.', go: 'room_closing' },
      { text: 'Leave her to it.', go: 'room_worker_end' },
    ] },
  ],
  room_water: [
    { do: 'gesture', who: 'eric', kind: 'point', to: 'water' },
    { do: 'gesture', who: 'canteen_worker', kind: 'point', to: 'water' },
    { do: 'roomWorker', state: 'water' },
    { say: 'canteen_worker', overheard: true, emo: 'polite', text: 'お水は、あちらです。コップは横にあります。' },
    { say: 'eric', emo: 'warm', text: 'Thank you.' },
    { go: 'room_worker_end' },
  ],
  room_trays: [
    { do: 'gesture', who: 'eric', kind: 'point', to: 'tray_return' },
    { do: 'gesture', who: 'canteen_worker', kind: 'point', to: 'tray_return' },
    { if: 'room_trays_seen', then: [
      { say: 'canteen_worker', overheard: true, emo: 'warm', text: 'はい、そこです。ありがとうございます。' },
    ], else: [
      { say: 'canteen_worker', overheard: true, emo: 'polite', text: 'はい、返却はこちらです。お箸は別にお願いします。' },
      { do: 'roomWorker', state: 'utensils' },
      { set: 'room_trays_seen' },
    ] },
    { go: 'room_worker_end' },
  ],
  room_closing: [
    { if: "period == 'lunch'", then: [
      { say: 'canteen_worker', overheard: true, emo: 'apologetic', text: '{sumimasen}、今ちょっと……。' },
      { do: 'roomWorker', state: 'wipe' },
      { say: 'eric', emo: 'warm', text: 'I’ll come back when it’s quieter.' },
      { go: 'room_worker_end' },
    ] },
    { if: 'room_closing_seen', then: [
      { say: 'canteen_worker', overheard: true, emo: 'warm', text: '今日も、外の椅子が待ってます。' },
      { do: 'gesture', who: 'canteen_worker', kind: 'point', to: 'canteen_exit' },
    ], else: [
      { say: 'eric', emo: 'curious', text: 'The chairs outside? You put them all away?' },
      { do: 'gesture', who: 'eric', kind: 'point', to: 'canteen_exit' },
      { say: 'canteen_worker', overheard: true, emo: 'tired', text: '外の椅子？ ああ、毎日です。雨の日は、中も片付けないと。' },
      { do: 'gesture', who: 'canteen_worker', kind: 'nod' },
      { set: 'room_closing_seen' },
    ] },
    { go: 'room_worker_end' },
  ],
  room_worker_end: [{ do: 'cam', back: true }, { do: 'save' }],
    arrive: [{ do: 'goal', text: 'Return to the fountain plaza.' }],
    to_plaza: [{ do: 'trip', to: 'plaza' }],
    sit_w: [{ do: 'sit', who: 'eric', at: 'canteen_seat_w' }],
    sit_e: [{ do: 'sit', who: 'eric', at: 'canteen_seat_e' }],
  },
};
