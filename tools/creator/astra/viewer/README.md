# Astra / Claude comparison

Open `index.html` through the repo server. It loads the independent Astra GLBs beside the unchanged Claude loader; Original replaces the left panel with the game reference. Models are not substituted when a file is missing. This page does not modify the live creator.

The view uses both loaders' native rigs, the approved relaxed idle and the game's walk. Animation time, lighting and camera controls are shared. Each loader normalizes its dressed rest height once; removing clothes or hair does not rescale the body. The original reference keeps its original layers. Astra's authored normals are retained and its opaque face map stays opaque; Claude's existing alpha face shader is reused unchanged.

## View and capture staging

This is an inspection outside the story, with a floor at y=0 and each standing figure normalized to height 1, facing +Z. There are no story props or implied locations. Both cameras have a 28-degree vertical field of view, start at a 45-degree orbit with an elevation of .08 radians, and look at (0,.5,0). Camera distance widens equally for narrow panels. Full-body framing includes the hair, hands, shoes and contact shadow. Close-ups target the face, neck, hood opening, right cuff or feet; omitted body parts are deliberately outside those views. The hood view is elevated from behind and switches Hair off to expose the cavity. Idle and walking stay in place: native hips x/z are held at rest, as in the baseline creator. Both faces look in their rig's forward direction. Identical hemisphere fill and an upper-front directional light reveal surfaces without a room or post effects. Inspect foot contact, garment penetration, neck seams and facial fidelity in motion as well as rest.

The quiet blue-gray palette matches the existing review viewer: ink #263a42, secondary text #526975, paper #eef3f5, line #bdcbd0, accent #176a76, stage #dde4ea. Rounded system display lettering is limited to the title; system sans carries controls and captions. A continuous two-stage comparison keeps equal scale visible, including on a phone. No decorative animation: only the models move, and reduced-motion users start paused.

`window.__astraComparison` exposes readiness/error, loaded characters and panels, plus `pose(name,time)` and `camera(angle,focus)` for deterministic captures. `body=eric` selects Eric at load. Camera keyboard arrows, named angles, focus presets and a zoom slider provide alternatives to drag/pinch. Frame scrubbing pauses both actors.
