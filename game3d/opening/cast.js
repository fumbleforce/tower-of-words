// Who the opening shows and how their cards look. Names and jobs follow docs/game/cast.md; the portraits are the
// approved ones the game already uses (assets/portraits). Card colours come from each person's hair and clothes.
// A card's name is in English with katakana under it; the line under that is their job, in capitals.

const P = [
  { id: 'eric', name: 'ERIC', kana: 'エリック', job: 'IT SUPPORT · B2', pics: ['eric-neutral', 'eric-surprised'], bg: '#1b2b4f', ac: '#6fd0c6', ink: '#ffffff' },
  { id: 'carina', name: 'CARINA', kana: 'カリーナ', job: 'IT SUPPORT · B2', pics: ['carina-neutral', 'carina-surprised'], bg: '#27324a', ac: '#ffcf5a', ink: '#ffffff' },
  { id: 'mio', name: 'MIO', kana: 'ミオ', job: 'PROGRAMMER · B2', pics: ['mio-smile', 'mio-neutral', 'mio-phone', 'mio-deadpan', 'mio-surprised'], bg: '#0f3a3c', ac: '#34e0b0', ink: '#ffffff' },
  { id: 'kenji', name: 'KENJI', kana: 'ケンジ', job: 'ENGINEER · B2', pics: ['kenji-grin', 'kenji-sheepish', 'kenji-neutral'], bg: '#3f9be8', ac: '#ffffff', ink: '#ffffff' },
  { id: 'mori', name: 'MR. MORI', kana: 'モリ', job: 'B2 TEAM', pics: ['mori-smile', 'mori-flustered', 'mori-neutral'], bg: '#3c4c6e', ac: '#a9e07f', ink: '#ffffff' },
  { id: 'emi', name: 'EMI', kana: 'エミ', job: 'TEAM LEAD · B2', pics: ['emi-neutral'], bg: '#f2584c', ac: '#fff1dc', ink: '#ffffff' },
  { id: 'kuro', name: 'KURO', kana: 'クロ', job: 'RECEPTION', pics: ['kuro-neutral'], bg: '#24173f', ac: '#c46bff', ink: '#ffffff', scale: 1.17 },
  { id: 'aoi', name: 'AOI', kana: 'アオイ', job: 'NEW HIRE', pics: ['aoi-neutral'], bg: '#ff4f9e', ac: '#1fd0dc', ink: '#ffffff' },
  { id: 'rei', name: 'REI', kana: 'レイ', job: 'SALES', pics: ['rei-neutral'], bg: '#8e97ff', ac: '#ffffff', ink: '#ffffff', scale: 1.05 },
  { id: 'guard', name: 'MR. ISHIBASHI', kana: 'イシバシ', job: 'SECURITY', pics: ['guard-amused', 'guard-neutral', 'guard-stern'], bg: '#22356c', ac: '#ffd84a', ink: '#ffffff' },
  { id: 'kuroda', name: 'MR. HAMADA', kana: 'ハマダ', job: 'ACCOUNTS · 12F', pics: ['kuroda-sleepy', 'kuroda-panicked', 'kuroda-neutral'], bg: '#5f7396', ac: '#d7c8ff', ink: '#ffffff' },
];

const byId = Object.fromEntries(P.map((p) => [p.id, p]));
const byPic = {};
for (const p of P) for (const n of p.pics) byPic[n] = p;

export const CAST = {
  list: P,
  get: (id) => byId[id],
  byPortrait: (n) => byPic[n],
  portraits: () => P.flatMap((p) => p.pics),
};
