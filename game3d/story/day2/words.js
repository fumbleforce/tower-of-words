// Pending registration by the day-2 builder. These do not become known until typed in the story.
export const WORDS = {
  tabetai: { ja: '食べたい', alias: ['たべたい'], ro: 'tabetai', en: 'I want to eat', phrase: true },
  nomitai: { ja: '飲みたい', alias: ['のみたい'], ro: 'nomitai', en: 'I want to drink', phrase: true },
};
export const BASE = {
  tabetai: { form: 'tai', ja: '食べる', ro: 'taberu', en: 'to eat' },
  nomitai: { form: 'tai', ja: '飲む', ro: 'nomu', en: 'to drink' },
};
export const FORM_NAME = { tai: '-tai form' };
export const FORM_NOTE = { tai: 'The -tai ending says you want to do something yourself. Tabetai means "I want to eat"; nomitai means "I want to drink".' };
