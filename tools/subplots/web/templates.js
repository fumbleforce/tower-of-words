// Templates for a new public scene: the steps it starts with and the parts its choice leads to. The words in brackets
// say what to write there; the author replaces them in the timeline. Every line has a delivery (the day checks want
// one), which the author changes in the Beat tab. Shared by the New scene dialog (newscene.js) and the server that
// writes the scene (create.mjs).
// Only the people who speak English with the player by canon do so on screen; everyone else speaks Japanese, overheard
// (GUIDE, Dialogue quality; docs/game/cast.md: Mio, Emi and Rei speak English), so the others' lines start as a Japanese placeholder.
const ENGLISH = ['eric', 'carina', 'mio', 'emi', 'rei'];
const line = (say, text, emo = 'casual') => (ENGLISH.includes(say) ? { say, emo, text } : { say, emo, overheard: true, text: '（ここに日本語のセリフ）' });

export const TEMPLATES = [
  {
    id: 'conversation', title: 'A conversation', starts: 'person',
    about: 'Someone talks with you, you answer, and they react to one of two replies.',
    build: ({ who, node, name }) => ({
      steps: [
        line(who, `(What ${name || 'they'} ${name ? 'says' : 'say'} first.)`),
        line('eric', '(What you say back.)'),
        { choice: [{ text: '(The first reply)', go: `${node}_a` }, { text: '(The second reply)', go: `${node}_b` }] },
      ],
      parts: {
        [`${node}_a`]: [line(who, `(How ${name || 'they'} ${name ? 'answers' : 'answer'} the first reply.)`)],
        [`${node}_b`]: [line(who, `(How ${name || 'they'} ${name ? 'answers' : 'answer'} the second reply.)`)],
      },
    }),
  },
  {
    id: 'exchange', title: 'A short exchange', starts: 'person',
    about: 'Three lines and done: they speak, you answer, they close it.',
    build: ({ who, name }) => ({
      steps: [
        line(who, `(What ${name || 'they'} ${name ? 'says' : 'say'}.)`),
        line('eric', '(What you say back.)'),
        line(who, `(How ${name || 'they'} ${name ? 'ends' : 'end'} it.)`),
      ],
      parts: {},
    }),
  },
  {
    id: 'look', title: 'Something to look at', starts: 'thing',
    about: 'You look at a thing in the place: what you notice, and what you think.',
    build: () => ({
      steps: ['> (What you notice, in a few words.)', line('eric', '(What you think, out loud.)', 'curious')],
      parts: {},
    }),
  },
];

// A node name from the author's title: lower case, words joined with _, unique in the file.
export function nodeName(title, taken = []) {
  const base = String(title || 'new scene').toLowerCase().normalize('NFKD').replace(/[^\w\s]/g, '').trim().replace(/\s+/g, '_').replace(/^(\d)/, 'n$1') || 'new_scene';
  let name = base, n = 2;
  while (taken.includes(name)) name = `${base}_${n++}`;
  return name;
}
