# Day-one branch routes

Run `npm run check:routes` with the local server on port 8771. `--list` and route IDs work through `node game3d/tools/fast-routes.mjs`. Default viewport is 390 × 844; WIDTH/HEIGHT and BASE select another viewport or worktree. Three worker processes run independent contexts under the existing browser/GPU lifecycle. Each worker is bounded to 280 seconds.

The fixtures enter through title → Continue → Autosave. A fixture declares progression just before a branch, optionally with a valid current-story checkpoint at a node entry. It does not replay the entire lead-in. Actions use the existing Use, Say (including practice), and Give menu handlers. Dialogues use the existing test auto-advance and explicit choice picks; game hurry speeds authored waits/movement. Runtime story arrays, hooks and state effects are not mocked.

Arrival and office modules declare named routes, exact choice text and expected nodes, flags, learned words, inventory, money or end state. Every unexpected choice, unused scripted choice, missing target, missing expected effect, page error or scene recovery error fails the route. The complete command also enumerates the current train/gate/office story arrays and requires every authored choice option, including conditional ones, to appear in a passing route. New choices therefore require routes. The result JSON records the individual option IDs and visited nodes; a selected subset reports partial coverage only.

`continue-midday` first captures an autosave written by an actual unfinished lunch scene, reloads through the title and finishes from that node. It checks that boot preserves the save and that inventory/money survive without replaying the caller. This supplements the broader checkpoint/Continue regression tests in tools/check/.

Scope: this is branch-flow and state-effect coverage, not exhaustive combinations of every flag, every target/word pair, spatial reachability from every spawn, save compatibility with every older version, or visual QA. Say and Give target the same handlers as their UI controls; this does not prove pointer picking. Seeded fixtures do not prove the full lead-in is reachable, so keep both full-day fast tests. No screenshots or real user saves are written by the branch driver.

Known source mismatch found while building the set: the vending prompt says “130 yen each” but coffee is priced at 120 in js/narrative/items.js. Money assertions follow item prices; correcting story wording is separate work.
