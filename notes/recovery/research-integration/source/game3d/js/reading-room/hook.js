import { conversationMemory } from '../conversations/state.js';
import { known } from '../lang.js';
import { flags } from '../narrative/state.js';
export function installResearch(game) {
  game.hooks.researchOffice = async (a) => {
    flags.research_office_ok = false;
    flags.research_mori_available = false;
    flags.research_mori_understood = false;
    flags.research_notes_recognized = false;
    flags.research_mori_return_ready = false;
    const provider = game.place?.researchOffice;
    if (!provider) return;
    const status = provider.ready();
    flags.research_mori_available = status.available;
    flags.research_mori_understood = status.understood;
    flags.research_notes_recognized = status.notesRecognized;
    flags.research_mori_return_ready = conversationMemory.ready('mori_return_norway', known);
    if (a.state !== 'available') flags.research_office_ok = !!(await provider.act(a));
  };
  game.hooks.research = async (a) => {
    flags.research_action_ok = false;
    flags.research_has_book = false;
    const provider = game.place?.research;
    if (!provider) return;
    if (a.state !== 'available') flags.research_action_ok = !!(await provider.act(a));
    flags.research_has_book = !!provider.state.read().active;
  };
}
