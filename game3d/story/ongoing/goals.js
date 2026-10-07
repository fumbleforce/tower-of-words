import { goal as saturdayGoal } from '../day3/shared.js';
import { goal as sundayGoal } from '../day4/shared.js';
import { goal as mondayGoal } from '../day5/shared.js';

const datedDefaults = new Set();
function collect(value) {
  if (!value || typeof value !== 'object') return;
  if (value.do === 'goal') datedDefaults.add(value.text);
  Object.values(value).forEach(collect);
}
[saturdayGoal(), sundayGoal(), mondayGoal()].forEach(collect);

// Keep repair instructions and their target pins; replace only the opening days'
// generic timetable advice when those conversations run in a continuing week.
export function continuingGoals(value) {
  if (Array.isArray(value)) return value.map(continuingGoals);
  if (!value || typeof value !== 'object') return value;
  if (value.do === 'goal' && datedDefaults.has(value.text)) return { do: 'ongoingGoal' };
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, continuingGoals(child)]));
}
