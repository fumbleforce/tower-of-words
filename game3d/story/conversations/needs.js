// What a Chat question may take for granted (issue #399). A choice that presumes something about the person names
// it in `needs: ['<who>.<what>']`, and shows only once the player has learned it (js/conversations/needs.js).
// Each entry is a condition over saved flags: the People-panel fact that teaches it (fact_<who>_<id>, set where the
// player hears it), or the older flags of the same scene, so saves from before the fact existed keep the topic.
// Never a day number or a met flag: meeting someone is not learning this about them.
export const NEEDS = {
  // "I usually eat in the machine room" (office.js lunch_start, day 1 lunch; bonds/day1.js)
  'mio.lunch_spot': 'fact_mio_lunch_spot || lunch_mio || lunch_mori',
  // Emi with the pool keys (day3/gym.js), at the pool (day3/pool.js), or at the club itself (clubs.js)
  'emi.swimming_club': 'fact_emi_swimming_club || d3_swim_done',
  // Kenji telling Eric where he goes after work (conversations/kenji.js)
  'kenji.arcade': 'kenji_arcade_talked',
};
