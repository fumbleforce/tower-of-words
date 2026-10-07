# Everyday cast conversation verification

Issue #287/#297, isolated `codex-everyday-cast`.

Independent root and reviewer proposals were compared before integration. The
six new modules add ordinary personal topics, repeat replies and five remembered
word connections alongside existing Mori, Kenji and Hamada conversations.
The canonical plan and implemented links belong in
[language progression](../docs/game/language-progression.md).

Cold read: dialogue, humanizer and character continuity review of all six modules.
Corrections made before voicing: the guard offers a short rest rather than
confusing a break with a day off; no unsupported shushing interpretation; no
unimplemented yukkuri lesson. Mio's already-understood follow-up has its own
repeat. Emi's actual club callback depends on its completed milestone. Kuro's
work-familiarity greeting depends on actual reception history and has a neutral
alternative. Aoi's unmotivated sumimasen reply was removed. Aoi's tennis history
uses completed play, not the earlier choice to play. Rei's repeat remembers a
stated preference rather than inventing a played game.

The native phone/desktop check opens every new Chat menu, types the optional
word, returns to the earlier speaker, and preserves knowledge, remarks and raw
conversation history through Quick Save and title Continue. Schedule and valid
approach-position fixtures are explicit; this is no traversal claim. Screenshot
inspection caught literal word tokens in choices after the functional pass.
Runner now uses the established word renderer for replies as well, with tests
for gating, branch selection, escaping and no automatic learning. Targeted
native taps on the rendered Japanese span verify actual choice selection.

Voices: 132 additional approved-clone exports, including both protagonists.
Kuro's uncommon written name initially passed a wrong pronunciation through
the general written-character check. An exact reading table now guides TTS and
checking for that utterance, including the existing Japanese-language gate.
Rejected original takes and exports remain in the batch folders. A duplicated
particle in an Aoi line was corrected and the old export retained separately.
All 132 final exports were scoped-uploaded and hash-copied to main. After rebasing onto the konbini service, all upstream
1,763 index entries, 1,697 clip records and 150 timed lines remain unchanged;
16 new timed lines have all 18 word surfaces. The full incidental timing rerun
still misses one old surface; its previous timing remains untouched.

Native voice checks triggered eight actual authored keys, including both protagonist
Kuro greetings: each decoded, advanced and ended without HTTP or page errors.
This is a runtime playback check, not a claim of human listening.

The final integration on north-grounds main f13d24b8 passed all 568 CPU
tests and both full opening-day routes (desktop and phone Carina), with zero
long gait, overlap or spin findings. Renderer baseline warnings for existing
world draw/triangle counts remain visible in the logs; this is no performance
improvement claim. All 1,552 collected voiced lines have clips, and the upstream
index, clip records and timing entries remain unchanged. Independent core review passed 30 JavaScript and three Python
tests; the first Mio framing fix passed a separate 18-test review.

Visual inspection found Mio facing away behind her desk. A locally owned
conversation camera and bounded listening pose now frame her face and the
player, including mid-choice Save/Continue. The wider audit then found analogous
Emi desk framing and Aoi/Rei/Kuro street obstructions. Target-specific office
listening overlays now stay separate; saved street pair shots use a local 45-degree
lens to clear the actual storefronts. Ordinary camera direction/lens, player
visibility protection and resize behavior remain unchanged outside those shots.

The five-speaker native audit captures each actual menu and NPC line on both
sizes. Four scoped camera views also pass Quick Save/title Continue and release.
A sequential Aoi-to-Rei Continue exposed a real 135-degree player turn-away:
node-entry replay restored his earlier pose while only the NPC face hook ran.
All six new Chat menus now explicitly face both participants using the existing
hook. The actual Runner replay regression covers all six; final sequential
Kuro/Aoi/Rei spoken frames measure zero player-to-interlocutor facing error on
both sizes. No global Runner restoration or actor relocation was introduced.

Final street evidence: `game3d/shots/everyday-chat/street-facing/`; office Emi
and unchanged guard: `speakers-framed/`. Earlier unsuccessful camera rounds and
strict-yaw diagnostics are retained. Checks use scheduled place/approach fixtures,
not full-day traversal, and this framing audit keeps voice off. Earlier eight-key
real-media playback evidence remains separate.

Final integration: all 37 opening-day branch routes and all 32 authored choices
pass. Two workers initially deferred behind the exclusive voice GPU job; only
their 25 unrun routes were rerun, with the original report retained. The actual
Start/Continue opening flow passes at desktop and phone sizes. The wider legacy
save harness now checks the exact current protagonist/cast, visited-place and
log migrations, uses public-mode settings, and accepts the real pause-load
confirmation before awaiting reload. Eleven save scenarios pass. Its unchanged
moving-Mori assertion exposes a pre-existing mesh-rig arrival bug: he reaches his
chief desk but stays standing. Independent native sender staging reproduces it;
follow-up #311 owns the underlying chair-arrival fix.

The seven-image Showcase renders and decodes every image at both sizes with zero
page errors. Its captures are hash-preserved in main and uploaded under the
asset lock. The broader public-bible audit visited 277 routes and checked 4,925
links/media; it reports 197 existing archive/source/quote problems, none on the
new Showcase. Those are not reported as a whole-bible pass. Final browser logs
and the merged branch report are preserved with the feature evidence.
