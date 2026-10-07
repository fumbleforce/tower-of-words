# Island map fit, issue 313

The map fits its canonical bounds into the actual space below the header and goal, and outside the lower controls. An expanded phone Places list can use a rectangle to the left of the toolbar. Fitted views stay fitted on resize; deliberate panning and zooming retain their existing behavior. Phone label placement has more collision-free candidates and prioritizes the central plaza while leaving geographic pin locations and touch targets intact.

## Validation

- Five focused viewport and label tests pass. They cover asymmetric fitting, panning to each edge, label/pin/control collisions, and the short phone map above expanded Places.
- Native map controls, selection, zoom, keyboard and travel checks pass at desktop and phone sizes (`round1`). The fit-specific check (`round3`) infers scale and canonical extent from rendered pin positions. It verifies header/control clearance, central phone labels, refitting on resize and expanded Places without another fit click.
- Root inspected every round3 capture. Independent source and visual review found no blocking issues and rated the bounded fit/readability change 8/10 at both sizes. The expanded phone map is small; the open Places list remains the primary destination selector. This does not certify every geographic or environment detail.
- Final CPU gate passes all 571 tests and all repository checks. Earlier CPU attempts failed the existing 400-line view budget; responsibilities were extracted into viewport and label helpers. No ceiling or test tolerance was relaxed.
- Full day-one routes pass at 1366×860 (Eric, 72 seconds) and 390×844 (Carina, 131 seconds including queue time), without overrides or page errors. Existing scene performance advisories are retained in the reports.
- The scoped Showcase browser check renders all four images at both sizes without errors. Four images were uploaded and SHA-preserved in main; older asset-lock records remain unchanged.

Captures and all failed attempts stay in `game3d/shots/map-fit/`; selected durable images are in Showcase `map-fit-1`. No new geography, routes or travel permission is introduced.
