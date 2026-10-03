// Pending registration by the day-2 builder. These do not become known until typed in the story.
export const WORDS = {
  tabetai: { ja: '食べたい', alias: ['たべたい'], ro: 'tabetai', en: 'I want to eat', phrase: true },
  nomitai: { ja: '飲みたい', alias: ['のみたい'], ro: 'nomitai', en: 'I want to drink', phrase: true },
  mitai: { ja: '見たい', alias: ['みたい'], ro: 'mitai', en: 'I want to see', phrase: true },
  ikitai: { ja: '行きたい', alias: ['いきたい'], ro: 'ikitai', en: 'I want to go', phrase: true },
};
export const BASE = {
  tabetai: { form: 'tai', ja: '食べる', ro: 'taberu', en: 'to eat' },
  nomitai: { form: 'tai', ja: '飲む', ro: 'nomu', en: 'to drink' },
  mitai: { form: 'tai', ja: '見る', ro: 'miru', en: 'to see' },
  ikitai: { form: 'tai', ja: '行く', ro: 'iku', en: 'to go' },
};
export const FORM_NAME = { tai: '-tai form' };
export const FORM_NOTE = { tai: 'The -tai ending says you want to do something yourself. Tabetai means "I want to eat"; nomitai means "I want to drink".' };
