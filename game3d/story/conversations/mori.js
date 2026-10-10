// Shared return conversation: no calendar deadline and no invented photo prop.
export default {
  on: { 'ask:mori': 'conversation_mori', 'ask:mori-travel': 'conversation_mori_travel' },
  nodes: {
    conversation_mori_travel: [
      { if: "place == 'office' && period_morning", then: [
        { say: 'mori', overheard: true, emo: 'apologetic', text: 'すみません。後で、少しお話ししましょう。' },
        { end: true },
      ] },
      { do: 'cam', on: 'mori', zoom: 1.35 },
      { say: 'eric', emo: 'curious', text: 'ノルウェー？' },
      { say: 'mori', overheard: true, emo: 'warm', text: 'はい。1994年にリレハンメルへ行きました。', clear: [{ ja: '1994年', en: '1994' }, { ja: 'リレハンメル', en: 'Lillehammer' }] },
      { say: 'mori', overheard: true, emo: 'fond', text: '寒かったですが、また行きたいですね。' },
      { do: 'cam', back: true },
    ],
    conversation_mori: [
      { if: "place == 'office' && period_morning", then: [
        { say: 'mori', overheard: true, emo: 'apologetic', text: 'すみません。後で、少しお話ししましょう。' },
        { do: 'gesture', who: 'mori', kind: 'nod', to: 'eric' },
        { end: true },
      ] },
      { do: 'cam', on: 'mori', zoom: 1.35 },
      { choice: [
        { text: '{ikitai}… Norway?', go: 'conversation_mori_return', if: '!mori_return_asked && !art_photo_seen && !ms2_mori && !ms3_mori' },
        { text: 'Try “mitai”.', go: 'conversation_mori_see_word', if: 'mori_return_asked && !know_mitai && !art_photo_seen && !ms2_mori && !ms3_mori' },
        { text: '{mitai}. I’d like to see the photos.', go: 'conversation_mori_photos', if: 'mori_return_asked && know_mitai && !mori_photos_requested && !art_photo_seen && !ms2_mori && !ms3_mori' },
        { text: 'Ask whether he found the photos.', go: 'conversation_mori_photos_pending', if: 'mori_photos_requested && !art_photo_seen && !ms2_mori && !ms3_mori' },
        { text: 'Ask about the drawing from his photograph.', go: 'conversation_mori_drawing', if: 'art_photo_seen || ms2_mori || ms3_mori' },
        { text: 'Let him get back to what he was doing.', go: 'conversation_mori_leave' },
      ] },
    ],
    conversation_mori_return: [
      { say: 'eric', emo: 'curious', text: 'ノルウェー……{ikitai}？' },
      { say: 'mori', overheard: true, emo: 'warm', text: 'ええ。また行きたいです。リレハンメルに。', clear: [{ ja: 'リレハンメル', en: 'Lillehammer' }] },
      { say: 'mori', overheard: true, emo: 'sheepish', text: 'その時の写真、まだ見つからなくて。……フォト。', clear: [{ ja: 'フォト', en: 'photo' }] },
      { say: 'eric', emo: 'curious', text: 'Photo?' },
      { say: 'mori', overheard: true, emo: 'warm', text: 'はい。' },
      { say: 'mori', overheard: true, emo: 'warm', text: '写真、見たいですか。' },
      { set: 'mori_return_asked' },
      { go: 'conversation_mori' },
    ],
    conversation_mori_see_word: [
      { say: 'mori', emo: 'slow', slow: true, text: '{mitai}。' },
      { do: 'type', word: 'mitai', from: 'mori', prompt: 'Try “I want to see”.' },
      { go: 'conversation_mori_photos_reply' },
    ],
    conversation_mori_photos: [
      { say: 'eric', emo: 'warm', text: '{mitai}。' },
      { go: 'conversation_mori_photos_reply' },
    ],
    conversation_mori_photos_reply: [
      { say: 'mori', overheard: true, emo: 'warm', text: '探しておきます。見つかったら、声をかけますね。' },
      { set: 'mori_photos_requested' },
      { do: 'cam', back: true },
    ],
    conversation_mori_photos_pending: [
      { say: 'eric', emo: 'curious', text: 'フォト？' },
      { say: 'mori', overheard: true, emo: 'apologetic', text: 'すみません、まだです。' },
      { do: 'cam', back: true },
    ],
    conversation_mori_drawing: [
      { say: 'eric', emo: 'curious', text: 'How’s the drawing coming along?' },
      { if: 'art_mori_started || ms3_mori', then: [
        { say: 'mori', overheard: true, emo: 'warm', text: '少しずつですが。次に来た時、また見てください。' },
      ], else: [
        { say: 'mori', overheard: true, emo: 'sheepish', text: 'まだ、迷っていまして。次は、描き始めたいですね。' },
      ] },
      { do: 'cam', back: true },
    ],
    conversation_mori_leave: [{ do: 'cam', back: true }],
  },
};
