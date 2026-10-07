// A booking remark can be understood after learning yoyaku elsewhere, on any later visit.
export default {
  on: { 'ask:kuroda': 'conversation_hamada', 'ask:kuroda-booking': 'conversation_hamada_booking' },
  nodes: {
    conversation_hamada: [
      { do: 'cam', on: 'kuroda', zoom: 1.3 },
      { call: 'conversation_hamada_name' },
      { choice: [
        { text: 'What do you do after work?', if: '!hamada_evenings_asked', go: 'conversation_hamada_evening' },
        { text: 'Do you go to karaoke often?', if: 'hamada_evenings_asked', go: 'conversation_hamada_regular' },
        { text: 'Ask about the number on his receipt.', if: 'ms2_kuroda || karaoke_receipt_seen', go: 'conversation_hamada_number' },
        { text: 'Let him get back to what he was doing.', go: 'conversation_hamada_leave' },
      ] },
    ],
    conversation_hamada_name: [
      { if: '!ms_hamada_named', then: [
        { say: 'kuroda', overheard: true, emo: 'polite', text: 'すみません。浜田です。経理にいます。', clear: [{ ja: '浜田', ro: 'Hamada', en: 'Hamada' }] },
        { say: 'eric', emo: 'warm', text: 'I’m {mc.name}, from IT support.' },
        { set: 'ms_hamada_named' }, { do: 'meet', who: 'kuroda' },
      ] },
    ],
    conversation_hamada_evening: [
      { say: 'eric', emo: 'curious', text: 'What do you do after work?' },
      { say: 'kuroda', overheard: true, emo: 'warm', text: '水曜日は、カラオケに行きます。', clear: ['カラオケ'] },
      { say: 'eric', emo: 'curious', text: 'Karaoke? At the place by the shops?' },
      { say: 'kuroda', overheard: true, emo: 'polite', text: 'はい。水曜日の夜は、私が予約しています。' },
      { set: 'hamada_evenings_asked' },
      { do: 'cam', back: true }, { do: 'save' },
    ],
    conversation_hamada_regular: [
      { say: 'eric', emo: 'curious', text: 'Do you go to karaoke often?' },
      { say: 'kuroda', overheard: true, emo: 'sheepish', text: '毎週、行っています。でも、いつも自分の曲まで時間が足りなくて。' },
      { say: 'kuroda', overheard: true, emo: 'polite', text: '水曜日の夜は、私が予約しています。' },
      { do: 'cam', back: true }, { do: 'save' },
    ],
    conversation_hamada_booking: [
      { do: 'cam', on: 'kuroda', zoom: 1.3 },
      { choice: [
        { text: '{yoyaku}… Ask about the booking he mentioned.', go: 'conversation_hamada_booking_ask' },
        { text: 'Do you go to karaoke often?', go: 'conversation_hamada_regular' },
        { text: 'Ask about the number on his receipt.', if: 'ms2_kuroda || karaoke_receipt_seen', go: 'conversation_hamada_number' },
        { text: 'Let him get back to what he was doing.', go: 'conversation_hamada_leave' },
      ] },
    ],
    conversation_hamada_booking_ask: [
      { do: 'cam', on: 'kuroda', zoom: 1.3 },
      { call: 'conversation_hamada_name' },
      { say: 'eric', emo: 'curious', text: '{yoyaku}……カラオケ？' },
      { say: 'kuroda', overheard: true, emo: 'warm', text: 'はい。水曜日です。よかったら、一緒に。' },
      { choice: [
        { text: '{isshoni}. I’d like to come along.', if: 'know_isshoni', go: 'conversation_hamada_accept' },
        { text: 'I’ll look for you there.', go: 'conversation_hamada_accept_plain' },
        { text: 'I’ll see whether I’m free.', go: 'conversation_hamada_maybe' },
      ] },
    ],
    conversation_hamada_accept: [{ say: 'eric', emo: 'warm', text: '{isshoni}。' }, { go: 'conversation_hamada_invited' }],
    conversation_hamada_accept_plain: [{ say: 'eric', emo: 'warm', text: 'I’ll look for you there.' }, { go: 'conversation_hamada_invited' }],
    conversation_hamada_invited: [
      { say: 'kuroda', overheard: true, emo: 'warm', text: 'では、向こうで。歌わなくても、大丈夫ですから。' },
      { set: 'hamada_booking_asked' },
      { do: 'remember', who: 'kuroda', id: 'karaoke_invitation', text: 'Invited you to join his regular karaoke evening.' },
      { do: 'cam', back: true }, { do: 'save' },
    ],
    conversation_hamada_maybe: [
      { say: 'kuroda', overheard: true, emo: 'polite', text: 'はい。ご都合のいい時に。' },
      { do: 'cam', back: true }, { do: 'save' },
    ],
    conversation_hamada_number: [
      { say: 'eric', emo: 'curious', text: 'Do you still have that song number?' },
      { say: 'kuroda', overheard: true, emo: 'warm', text: 'はい。もう覚えました。でも、レシートは捨てられなくて。', clear: ['レシート'] },
      { do: 'cam', back: true },
    ],
    conversation_hamada_leave: [{ do: 'cam', back: true }],
  },
};
