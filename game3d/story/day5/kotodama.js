// #230 story bridge data for Claude. Not a minigame implementation or a new engine hook.
export const KOTODAMA = {
  place: 'office', period: 'evening', weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  people: ['kenji', 'mori', 'mio'],
  available: 'day >= 5',
  first: {
    request: { who: 'kenji', item: 'melon', machine: 'vend' },
    command: ['kenji', 'ni', 'melon', 'o', 'dashite', 'kudasai'],
    sentence: { ja: 'ケンジさんに メロンソーダを だしてください。', ro: 'Kenji-san ni meron sooda o dashite kudasai.', en: 'Please give the melon soda to Kenji.' },
    // Apply the existing polite form without introducing a second typing lesson or requiring a power pick.
    polite: true,
    item: { id: 'melon', jp: 'メロンソーダ', r: 'meron sooda', en: 'melon soda', a: 'a melon soda', from: 'vend' },
    requestLine: { say: 'kenji', overheard: true, emo: 'polite', text: 'メロンソーダをください。', clear: ['メロンソーダ'] },
    guide: [
      { tap: 'kenji', text: 'Tap Kenji, who asked for the drink.' },
      { tap: 'ni', text: 'Tap に (ni, to). The drink is going to Kenji.' },
      { tap: 'melon', text: 'Tap the melon soda in the machine.' },
      { tap: 'o', text: 'Tap を (o). The melon soda is what you’re moving.' },
      { tap: 'dashite', text: 'Send it with だしてください (dashite kudasai, give it out, please).' },
    ],
    pauseAfterDelivery: true,
    successEvent: 'kotodama_first', cancelEvent: 'kotodama_cancel',
    successFlag: 'd5_delivery_seen',
    // A standalone tutorial completion never substitutes for the world witnessing this delivery.
    tutorialFlag: 'd5_team_witnessed',
  },
  repeat: {
    requires: 'd5_team_witnessed', exitEvent: 'kotodama_exit',
    lastRecipientFlag: 'd5_last_recipient', label: 'Round',
    // Empty means no delivery this run. For a multi-recipient command use the last visible landing.
    emptyRecipient: '',
  },
  text: {
    firstLeave: 'Leave the demonstration.', afterFirstLeave: 'Finish with that first drink.',
    continue: 'Try a few more deliveries.', finish: 'Back to B2.',
    // Expand with the active protagonist before passing to common/jp markup or clip-key generation.
    launchedMio: { say: 'mio', emo: 'dry', text: 'Okay, no. {mc.name}, put me down.' },
  },
  // Days 3/4 offer command use and a separate printer lesson only; no unexplained game launch there.
  preparations: [
    { day: 3, place: 'gym', node: 'd3_print', lesson: 'd3_dashite_word' },
    { day: 4, place: 'gym', node: 'd4_printer', lesson: 'd3_dashite_word' },
    { day: 5, place: 'office', node: 'd5_delivery_prepare', lesson: 'd5_printer_lesson' },
  ],
};
