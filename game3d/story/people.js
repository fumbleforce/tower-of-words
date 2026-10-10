// The People panel's card text for everyone who has one (docs/game/cast.md, "Names on screen", People panel
// column): the name, the line about them and the colour of their initial. This is the only home for it. The
// engine imports it up front (js/sim.js), so the panel is right on any day, after a load, before any place's
// story file has loaded. Someone not listed here never shows in the panel.
export default {
  mio: { name: 'Mio', about: 'Programmer. The only one with English. Hates bowing. Drinks black canned coffee.', color: '#5fc6bf' },
  guard: { name: 'The guard', about: 'Strict, fair, no English. Feeds a cat he says is not there.', color: '#8ea2c8' },
  kuroda: { name: 'Mr. Hamada', about: 'Accounts, 12th floor. Falls asleep on trains, late through every gate.', color: '#b3a58f' },
  mori: { name: 'Mr. Mori', about: 'Used to be a manager. Formal and kind. Makes the tea. Drinks corn soup from a can.', color: '#b9a3d3' },
  kenji: {
    name: 'Kenji',
    about: 'Newest on the team before you, 21. Keen to help, easily distracted. Borrowed your chair. Lives on melon soda.',
    color: '#9fb6d8',
  },
  kuro: { name: 'Kuro', introduction: 'd3_kuro_intro', about: 'Receptionist at the head office. Goes to the swimming club with Emi.', color: '#c3a7d6' },
  aoi: { name: 'Aoi', introduction: 'd3_aoi_intro', about: 'Another new hire. Learning her way around the island too.', color: '#e79fb0' },
  rei: { name: 'Rei', introduction: 'd4_rei_intro', about: 'Works in Sales. Plays tennis on Sundays.', color: '#c9ced8' },
  emi: { name: 'Emi', about: 'Runs B2. Spent day one upstairs fighting for a parts budget.', color: '#c98a6b' },
};
