# Phone dialogue header verification

The generic phone grid rule included an ID inside `:not`, giving it enough specificity to put the speaker across both columns. `:where` removes that accidental specificity; the speaker name and role now stack in their own column. Full names wrap, roles retain the existing ellipsis, and controls retain 44px targets. Desktop layout is unchanged.

- Fifteen native UI fixtures cover Mori, Mio, Ishibashi, translated remarks and phone messages at320,390 and1366px. DOM bounds are disjoint, phone controls remain44px, and no page errors occur. These are UI fixtures in the office, not evidence of scene staging.
- Independent source/visual review found no blocking overlap. At320px long names wrap and roles shorten.
- CPU581 checks pass. Full day-one Eric desktop73s and Carina phone72s pass with no overrides; existing performance warnings remain in logs. First attempts were deferred by the fair GPU queue and are retained.
- All27 before/intermediate/final captures are in Showcase; all uploaded hashes match main. Native reports, capture script and check logs remain under game3d/shots/dialogue-header.
- The sender investigation will repeat its actual Mori remark after rebasing this change.
