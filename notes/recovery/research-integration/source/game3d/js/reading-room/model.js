import { REFERENCES } from './pages.js';
const BOOKS = Object.keys(REFERENCES);
export const READING_SEATS = ['research_table_seat', 'research_window_seat', 'research_side_seat', 'research_end_seat'];
const book = (id) => BOOKS.includes(id);
const seat = (id) => READING_SEATS.includes(id);
const page = (id, value) => Number.isInteger(value) && value >= 0 && value < REFERENCES[id].pages.length;
export function loadReading(saved) {
  const state = { v: 1, active: null, pages: { weather: 0, copier: 0 }, marks: { weather: null, copier: null } };
  if (saved?.v !== 1) return state;
  for (const id of BOOKS) {
    if (page(id, saved.pages?.[id])) state.pages[id] = saved.pages[id];
    if (page(id, saved.marks?.[id])) state.marks[id] = saved.marks[id];
  }
  if (book(saved.active?.book) && seat(saved.active?.seat))
    state.active = { book: saved.active.book, seat: saved.active.seat };
  return state;
}
export function readingAction(saved, action) {
  const state = loadReading(saved);
  switch (action.type) {
    case 'select':
      if (!book(action.book) || !seat(action.seat)) throw new Error('Invalid reading position');
      state.active = { book: action.book, seat: action.seat };
      if (state.marks[action.book] !== null) state.pages[action.book] = state.marks[action.book];
      break;
    case 'turn':
      if (!state.active || !page(state.active.book, action.page)) throw new Error('Invalid reference page');
      state.pages[state.active.book] = action.page;
      break;
    case 'mark':
      if (!state.active) throw new Error('No open reference');
      state.marks[state.active.book] = action.clear ? null : state.pages[state.active.book];
      break;
    case 'putBack':
      state.active = null;
      break;
    default:
      throw new Error(`Unknown reading action: ${action.type}`);
  }
  return state;
}
export function bookLocations(saved) {
  const state = loadReading(saved);
  return Object.fromEntries(BOOKS.map((id) => [id, state.active?.book === id ? state.active.seat : 'shelf']));
}
export function currentPage(saved) {
  const state = loadReading(saved);
  return state.active ? REFERENCES[state.active.book].pages[state.pages[state.active.book]] : null;
}
