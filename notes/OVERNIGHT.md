# Overnight goal (Jørgen, 2026-09-29)

Make day 1 (train → gate → B2 office) the best it can be at production quality, without him.

- **Scope:** day 1 only. No new premises, characters, locations or systems beyond those listed under "Next" below. Finish what's in progress (TODO.md, "In progress") before starting anything else.
- **Bar:** every place and the whole day pass the checklists in notes/PRODUCTION.md and notes/ONBOARDING.md, scored by fresh critic and cold-player agents. Fix what they flag and keep iterating until they pass.
- **Polish:** optimise pathing and the quality of cutscene moments, so every part of the game feels polished.
- **Build for the future:** prefer work that later days can reuse:
  - systems for progressing relationships
  - interactions between characters
  - cutscene moments and reward moments
  - motion that feels great
  - graphics
  - asset quality: a reusable asset library and an asset gallery
- **Decisions:** anything that needs his taste (art picks, style, cast, voices) goes into the bible's Review section with options. Don't pick for him. Carry on with work that doesn't depend on it.
- **Pushes:** only through game3d/tools/push.sh, after the fast test passes on both gate routes and on phone. At most one push every 2 hours, with the build id noted.
- **Guardrails:**
  - No more than 6 agents at once.
  - One headless browser (/tmp/claude-1000/browser.lock) and one GPU job (/tmp/claude-1000/gpu.lock) at a time.
  - No more than 50 Meshy or other paid credits in total.
  - Don't touch island/private.
  - Nothing destructive in git: no force-pushes and no history rewrites.
- **Stop** when everything in progress is done and passes, or when the same problem fails three rounds running. Then write up what's stuck instead of trying something wild.
- **Morning report:** one page, with what changed (with screenshots), the live build id, what's waiting in Review, and what he should play first. It goes in notes/MORNING-REPORT.md and is sent to him.

## Plan

1. **Finish in progress:** builder, shell, feel, bible (review queue), style, lift, and the art rounds (Kenji round 2, Eric in the original style, Mio's phone portrait). To keep within 6 agents, the creator experiment and voice input are paused until slots free up, then resumed in that order (voice input first).
2. **Quality loop:** after each push, fresh critics score each place against the PRODUCTION bar, and a cold player scores the first 5 minutes and the whole day against the ONBOARDING checklist. Fixes go to one focused agent each.
3. **Next** (reusable, only after step 1):
   - Cutscene and staging toolkit: camera shots, blocking, walk-to without overlaps, reaction beats.
   - Relationship progression and interactions between characters: bonds, ambient NPC-to-NPC moments.
   - Reward moments: the learned-word beat, bond steps.
   - An asset library and gallery page listing every model, portrait, sound and prop, with its status.

## Log

- 2026-09-29 00:xx: goal set; 11 agents running; creator and voice input paused to get under 6 as the others finish.
