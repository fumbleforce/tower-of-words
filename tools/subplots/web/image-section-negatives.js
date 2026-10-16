// Exclusions per composer section (#616; Jørgen, 2026-10-16: "fine grain the exclusion so we build that per section,
// so a clothing negative and a background negative"). Each section with prompt words has its own words to avoid,
// typed next to it; a person's clothing and appearance exclusions sit with that person (image-people.js). They only
// add to the negative: the rating exclusions stay on whatever is typed here (image-compose.js, lockedExclusions).
// The key order is the order they join the assembled negative; the older single free `negative` follows them.
import {esc} from './common.js';

export const SECTION_NEGATIVES = Object.freeze([
  ['scene', 'What happens'], ['pose', 'Pose'], ['setting', 'Setting'], ['light', 'Light'], ['camera', 'Camera'], ['details', 'More details'],
]);
export const sectionNegativeWords = c => SECTION_NEGATIVES.map(([key]) => c.sectionNegatives?.[key]);

const PLACEHOLDER = {scene: 'actions or props to keep out', pose: 'poses to keep out', setting: 'things to keep out of the background',
  light: 'lighting to keep out', camera: 'angles or crops to keep out', details: 'details to keep out'};
export function sectionNegativeHtml(c, key) {
  const label = SECTION_NEGATIVES.find(([k]) => k === key)[1];
  return `<label class="section-avoid"><span>Avoid</span><input data-section-negative="${key}" value="${esc(c.sectionNegatives?.[key] || '')}" placeholder="${esc(PLACEHOLDER[key])}" aria-label="${esc(label + ': words to avoid')}"></label>`;
}
// edit(mutator, repaint) is the composer's; typing never repaints, so the field keeps its focus
export function bindSectionNegatives(host, edit) {
  host.querySelectorAll('[data-section-negative]').forEach(el => el.oninput = () => edit(c => {
    const key = el.dataset.sectionNegative;
    c.sectionNegatives = {...c.sectionNegatives, [key]: el.value};
    if (!el.value.trim()) delete c.sectionNegatives[key];
    if (!Object.keys(c.sectionNegatives).length) delete c.sectionNegatives;
    c.override = null;
  }, false));
}
