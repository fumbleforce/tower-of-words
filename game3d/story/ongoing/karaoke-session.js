// Integration waits for an approved sung passage and matching visible performance.
// Queue and receipt actions alone do not complete this meeting or its milestone.
export const karaokeNodes = {
  ongoing_karaoke: [
    { do: 'karaokeClub', state: 'start' },
    { call: 'conversation_hamada_name' },
    { if: 'karaoke_first_song_heard', then: [{ go: 'ongoing_karaoke_return' }] },
    { say: 'kenji', emo: 'warm', text: 'Come in. You can sit here. I found some songs.' },
    { do: 'karaokeClub', state: 'queue' },
    { say: 'kuroda', overheard: true, emo: 'polite', text: '私のは、後でも大丈夫ですよ。' },
    { say: 'eric', emo: 'curious', text: 'Did you choose one as well?' },
    { do: 'karaokeClub', state: 'receiptFront' },
    { say: 'eric', emo: 'puzzled', text: 'That’s the price, isn’t it?' },
    { say: 'kuroda', overheard: true, emo: 'sheepish', text: 'あ、裏です。こちらに、番号を書いたんです。' },
    { do: 'karaokeClub', state: 'receiptBack' },
    { set: 'karaoke_receipt_seen' },
    { say: 'eric', emo: 'warm', text: 'Oh, 0718. Here it is.' },
    { do: 'karaokeClub', state: 'selectNumber' },
    { go: 'ongoing_karaoke_order' },
  ],
  ongoing_karaoke_order: [
    { do: 'karaokeClub', state: 'group' },
    { choice: [
      { text: 'Ask Kenji to move his extra songs back.', go: 'ongoing_karaoke_make_room' },
      { text: 'Ask Hamada whether he wants this one next.', go: 'ongoing_karaoke_offer_turn' },
      { text: 'Leave before the singing starts.', go: 'ongoing_karaoke_leave' },
    ] },
  ],
  ongoing_karaoke_make_room: [
    { say: 'eric', emo: 'warm', text: 'Could we put his one next? You’ve got a few in there.' },
    { say: 'kenji', emo: 'sheepish', text: 'Ah, all mine. Sorry. I put in too many.' },
    { do: 'karaokeClub', state: 'clearQueueExtras' },
    { go: 'ongoing_karaoke_offer_turn' },
  ],
  ongoing_karaoke_offer_turn: [
    { say: 'eric', emo: 'curious', text: 'This one next?' },
    { say: 'kuroda', overheard: true, emo: 'hesitant', text: 'いいんですか。では、一曲だけ。' },
    { do: 'karaokeClub', state: 'clearQueueExtras' },
    { do: 'karaokeClub', state: 'takeMicrophone', who: 'kuroda' },
    { say: 'kenji', emo: 'warm', text: 'One song? You can do more. I wanted three.' },
    { go: 'ongoing_karaoke_song' },
  ],
  ongoing_karaoke_song: [
    { do: 'karaokeClub', state: 'perform', who: 'kuroda', song: '0718' },
    { set: 'karaoke_first_song_heard' },
    { do: 'karaokeClub', state: 'group' },
    { say: 'kuroda', overheard: true, emo: 'warm', text: '最後まで歌えたの、久しぶりです。' },
    { say: 'kenji', emo: 'warm', text: 'Keep the microphone. What song next?' },
    { do: 'karaokeClub', state: 'keepMicrophone', who: 'kuroda' },
    { if: 'bondready_kuroda == 3 && !ms3_kuroda', then: [
      { set: 'ms3_kuroda' }, { do: 'bondStep', who: 'kuroda', to: 3 },
      { do: 'remember', who: 'kuroda', id: 'karaoke_turn', text: 'Heard his song all the way through, and he kept the microphone.' },
    ] },
    { do: 'bond', who: 'kuroda', source: 'scene', why: 'stayed to hear his song' },
    { go: 'ongoing_karaoke_after' },
  ],
  ongoing_karaoke_after: [
    { choice: [
      { text: 'Ask about their regular booking.', go: 'ongoing_karaoke_booking' },
      { text: 'Listen to the song once more.', go: 'ongoing_karaoke_again' },
      { text: 'Say goodnight.', go: 'ongoing_karaoke_leave' },
    ] },
  ],
  ongoing_karaoke_booking: [
    { say: 'eric', emo: 'curious', text: 'Do you book this room every week?' },
    { say: 'kuroda', overheard: true, emo: 'polite', text: 'はい。水曜日の夜は、私が予約しています。' },
    { say: 'kenji', emo: 'warm', text: 'He books it. Then he comes to get me. I forget.' },
    { go: 'ongoing_karaoke_after' },
  ],
  ongoing_karaoke_again: [
    { if: 'know_mouichido', then: [{ say: 'eric', emo: 'warm', text: '{mouichido}？' }], else: [{ say: 'eric', emo: 'warm', text: 'Could you sing that again?' }] },
    { say: 'kuroda', overheard: true, emo: 'warm', text: 'はい。同じ曲でも、よろしければ。' },
    { do: 'karaokeClub', state: 'selectNumber' },
    { do: 'karaokeClub', state: 'takeMicrophone', who: 'kuroda' },
    { do: 'karaokeClub', state: 'perform', who: 'kuroda', song: '0718' },
    { go: 'ongoing_karaoke_leave' },
  ],
  ongoing_karaoke_return: [
    { say: 'kenji', emo: 'warm', text: 'You came! Same seat?' },
    { say: 'kuroda', overheard: true, emo: 'warm', text: '今日は、先に入れておきました。' },
    { do: 'karaokeClub', state: 'selectNumber' },
    { choice: [
      { text: 'Stay and listen.', go: 'ongoing_karaoke_offer_turn' },
      { text: 'Ask about their regular booking.', go: 'ongoing_karaoke_booking' },
      { text: 'Leave them to their evening.', go: 'ongoing_karaoke_leave' },
    ] },
  ],
  ongoing_karaoke_leave: [{ do: 'karaokeClub', state: 'finish' }, { do: 'ongoingGoal' }, { do: 'save' }],
};
