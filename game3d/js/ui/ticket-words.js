// What the ticket app's Japanese labels teach (ui/tickets-view.js). A tap explains a label and offers a short typed
// attempt; the word is learned only once the attempt succeeds (docs/game/words.md, the ticket app; #638). Buttons
// (Back, Close, Take ticket) navigate and teach nothing.
//   createLabelLessons({ practice, learn, isKnown }) -> { explain(id), attempt(id) }
//     practice(id) -> Promise<boolean>   the typed attempt (the game's typing prompt); false when he backs out
//     learn(id) -> true when the word is new to him; isKnown(id) -> whether he knows it
//     explain(id) -> { id, known }       what a tap shows: the word, never learned by this
//     attempt(id) -> Promise<boolean>    true when the word was newly learned by a successful attempt
export function createLabelLessons({ practice, learn, isKnown }) {
  return {
    explain: (id) => ({ id, known: !!isKnown(id) }),
    async attempt(id) {
      if (isKnown(id)) return false;
      if (!(await practice(id))) return false;
      return !!learn(id);
    },
  };
}
