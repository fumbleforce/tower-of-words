# Outdoor plan

One programme for everything outside (Jørgen, 2026-10-09: "Lets not keep 2 modes, but adopt diorama, improve it furthe, roll it out as reusable assets across the world"). Claude owns it (C-0486). The issues below are stages of this plan, not separate jobs; a builder working on one reads this first.

## Order

1. **One look (#321).** The street style (`?diorama=1`) becomes the only look; the old faceted look's code goes. Starts when the forecourt performance work (#372) has landed, since both touch the shared planting builders.
2. **The world kit (#367).** Reusable pieces built from the street style, declared once with seeded variation so places still look hand-placed: building parts, street furniture, planting, ground pieces, lamps, materials (including the monorail metal, #366). Each piece also reports what it blocks for walking, where you can sit or enter, and what glows at night. The bible gets the Asset library page. Design: notes/architecture/world-kit.md. The street style only ever existed for the forecourt (scenes/diorama/: its planting and leaf dressing are fenced to forecourt coordinates, its details fixed to the station), so in step 1 no other place had anything to switch: the kit must build street-style pieces for every place, and the shared builders' older trees, hedges and shrubs stay until it does. The style is also heavy: switched on, the forecourt went over its place budget (#321; notes/PERF.md, Place budgets), so each kit piece needs its lighter phone version from the start.
3. **Place passes.** One builder per place does everything that place needs in one go, using the kit:
   - walkable ground and edges from one definition (#362; notes/grounds-system.md),
   - the lighting rig (#370; notes/lighting-system.md),
   - views that look designed from the follow camera in every direction (#375),
   - no blob-shaped planting beds (GUIDE).
   Places with disjoint files can run side by side, within the memory limit (at most about 4 heavy builders).

## Done so far

Ground system stage 1 (forecourt, campus), planting models, lighting stages 1 and 2 (forecourt, Eric's dorm; the plaza, shop street, east lane and dorm courtyard), far view in every outdoor place, place budgets.
