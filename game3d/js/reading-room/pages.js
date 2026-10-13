// The same authored sheet is used on the table, in close-up and in retained Papers.
export const REFERENCES = {
  weather: { title: 'Weather instruments', code: 'W–01', color: '#677f75', pages: ['weather-plan', 'weather-shapes'] },
  copier: {
    title: 'Copier: paper and status',
    code: 'C–02',
    color: '#6c7e91',
    pages: ['copier-exterior', 'copier-paper'],
  },
};
export const PAPER_TITLES = {
  'weather-plan': 'Weather station plan',
  'weather-shapes': 'Weather instruments',
  'copier-exterior': 'Copier exterior',
  'copier-paper': 'Copier paper positions',
  'mori-copy': 'Mori’s old copier record',
};
export const paperId = (page) => `research_${page.replaceAll('-', '_')}`;
export const pageUrl = (page) => {
  if (!Object.hasOwn(PAPER_TITLES, page)) throw new Error(`Unknown reference page: ${page}`);
  return new URL(`../../assets/references/${page}.svg`, import.meta.url).href;
};
