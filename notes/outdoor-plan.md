# Outdoor plan

One programme for everything outside (Jørgen, 2026-10-09: "Lets not keep 2 modes, but adopt diorama, improve it furthe, roll it out as reusable assets across the world"). Claude owns it (C-0486). The issues below are stages of this plan, not separate jobs; a builder working on one reads this first.

## Order

1. **One look (#321).** The street style (`?diorama=1`) becomes the only look; the old faceted look's code goes. Starts when the forecourt performance work (#372) has landed, since both touch the shared planting builders.
2. **The world kit (#367).** Reusable pieces built from the street style, declared once with seeded variation so places still look hand-placed: building parts, street furniture, planting, ground pieces, lamps, materials (including the monorail metal, #366). Each piece also reports what it blocks for walking, where you can sit or enter, and what glows at night. The bible gets the Asset library page. Design: notes/architecture/world-kit.md.
3. **Place passes.** One builder per place does everything that place needs in one go, using the kit:
   - walkable ground and edges from one definition (#362; notes/grounds-system.md),
   - the lighting rig (#370; notes/lighting-system.md),
   - views that look designed from the follow camera in every direction (#375),
   - no blob-shaped planting beds (GUIDE).
   Places with disjoint files can run side by side, within the memory limit (at most about 4 heavy builders).

## Done so far

Ground system stage 1 (forecourt, campus), planting models, lighting stage 1 (forecourt, Eric's dorm), far view in every outdoor place, place budgets.
