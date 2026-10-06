// Day-two words become known through their contextual typing steps.
export const WORDS = {
  yasumi: { ja: '休み', alias: ['やすみ'], ro: 'yasumi', en: 'a break; a day off', phrase: true, voice: 'eric-yasumi' },
  kanpai: { ja: '乾杯', alias: ['かんぱい'], ro: 'kanpai', en: 'cheers', phrase: true, voice: 'eric-kanpai' },
  oishii: { ja: 'おいしい', ro: 'oishii', en: 'delicious', phrase: true, voice: 'eric-oishii' },
  mouichido: { ja: 'もう一度', alias: ['もういちど', 'mou ichido'], ro: 'mou ichido', en: 'once more', phrase: true, voice: 'eric-mouichido' },
  daijoubu: { ja: '大丈夫', alias: ['だいじょうぶ', 'daijōbu'], ro: 'daijoubu', en: 'okay; all right', phrase: true, voice: 'eric-daijoubu' },
  tabetai: { ja: '食べたい', alias: ['たべたい'], ro: 'tabetai', en: 'I want to eat', phrase: true, voice: 'eric-tabetai' },
  nomitai: { ja: '飲みたい', alias: ['のみたい'], ro: 'nomitai', en: 'I want to drink', phrase: true, voice: 'eric-nomitai' },
  mitai: { ja: '見たい', alias: ['みたい'], ro: 'mitai', en: 'I want to see', phrase: true, voice: 'eric-mitai' },
  ikitai: { ja: '行きたい', alias: ['いきたい'], ro: 'ikitai', en: 'I want to go', phrase: true, voice: 'eric-ikitai' },
};
export const BASE = {
  tabetai: { form: 'tai', ja: '食べる', ro: 'taberu', en: 'to eat' },
  nomitai: { form: 'tai', ja: '飲む', ro: 'nomu', en: 'to drink' },
  mitai: { form: 'tai', ja: '見る', ro: 'miru', en: 'to see' },
  ikitai: { form: 'tai', ja: '行く', ro: 'iku', en: 'to go' },
};
export const FORM_NAME = { tai: '-tai form' };
export const FORM_NOTE = { tai: 'The -tai ending says you want to do something yourself. Tabetai means "I want to eat"; nomitai means "I want to drink".' };
