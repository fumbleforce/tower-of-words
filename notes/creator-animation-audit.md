# Creator idle orientation

Codex, 2026-09-29. CPU measurements of the current GLBs and one neutral idle
candidate. The original assets and creator animation runtime are unchanged.

The full idle clip already contains the large turns before retargeting. Its head
faces about 77° right at one second and 85° left at two seconds. The creator
currently freezes the clip before these movements. Its turntable was also enabled
by default when this audit began; the coordinating Codex agent has now changed
that default to off and labelled the control Auto-turn.

Reproduce from the repo root:

```sh
node tools/creator/inspect_animation.mjs
```

The tool reads the binary GLBs, reconstructs their node hierarchy, samples their
animation with the repository's Three.js AnimationMixer, and compares the Hips
and Head world rotations with their inverse-bind orientations. It does not load
textures, start a browser, use a GPU, or write files. Additional GLB paths can be
passed as arguments. Unsupported accessor formats or interpolation fail explicitly.

Yaw is the heading of the bind-space forward vector (+Z) after skin rotation,
projected onto the XZ plane. Tilt is the angle between the transformed bind-space
up vector and world up. These are bone measurements; no render was inspected.

| Clip and sample | Hips yaw | Head yaw | Head tilt |
| --- | ---: | ---: | ---: |
| Idle, 0.0 s | -44.990° | -0.109° | 14.381° |
| Idle, held frame at 0.4 s | -45.108° | 12.885° | 11.886° |
| Idle, 1.0 s | -10.002° | 76.739° | 5.066° |
| Idle, 2.0 s | -38.696° | -85.175° | 21.960° |
| Idle, 3.0 s | -61.412° | -56.776° | 9.910° |
| Walk, 0.0 s | 1.971° | 2.327° | 2.319° |
| Walk, 0.4 s | -3.444° | 4.671° | 4.524° |

Across samples at 120 Hz, the 4.033 s idle has head yaw from -137.354° to 106.157°
and hips yaw from -78.254° to 6.440°. The 1.067 s walk has head yaw from 0.749°
to 5.498° and hips yaw from -3.444° to 6.701°. Both clips' hips parents have an
identity world rotation. The diagnostic prints file hashes so these results can
be tied to the assets if Claude replaces them. Measured SHA-256 values:

```text
idle.glb  80203d0b956171c332d7dbcc518946afa7dc3299cecab9792ab55fa5f953ea23
walk.glb  ca6c2cd6e7912ea6c883eeed241792341f5eef2ebf04da404317411148884272
```

## Source findings and handoff

1. `tools/creator/recipe.js:323` copies the original bone quaternion tracks.
   Line 325 premultiplies the hips by their parent's rotation; that rotation is
   identity in both measured GLBs. The large animated turns are therefore present
   in the input to the creator. A constant rig or hips rotation will not remove
   the changing head and torso turns throughout the idle.
2. `tools/creator/recipe.js:364` holds idle at 0.4 s, and line 367 sets its time
   scale to zero. The large later turns cannot play through this path. The held
   pose still has a 45° pelvis turn with the upper body compensating for it.
   Switching to walk removes much of that twist. A 90° face jump from the held
   pose to the measured walking poses was not reproduced by these measurements.
3. `tools/creator/index.html:105` originally defaulted `spin` to true. Lines
   129–130 add 0.5 radians per second to the whole character's yaw, reaching 90°
   in 3.142 s even with the idle action frozen. The coordinating agent has changed
   the initial state and matching button state to off. Leave Auto-turn off when
   comparing idle, walk, or mixed bodies.

Claude's smallest durable fix is a neutral idle replacement on the same shared
skeleton, followed by removing the 0.4 s hold in `recipe.js:364–367` once the
replacement passes review. Keep the current hold while preparing that candidate;
changing the common rig axes would also affect the stable walk. Before replacing
anything, run this probe on the candidate and compare Eric and Mio at a fixed
root yaw through a full loop and idle/walk fades. A neutral pose must be checked
at both pelvis and head, since their turns can compensate at one frame.

The probe verifies source animation rotations. It does not establish that Mio's
retargeted proportions, skin deformation, clothing fit, or rendered transitions
are correct; those remain the creator owner's visual checks.

## Neutral idle candidate

Claude's handoff C-0006 authorized a candidate on the existing shared skeleton.
`art/parts/candidates/idle-neutral.glb` contains one four-second looping animation.
It starts from Eric's inverse-bind standing pose, retains the leg and foot
transforms, lowers both upper arms by 18° in the body's frontal plane, and adds
0.35° of forward/back torso breathing. The original elbow and hand angles remain.
No walking stride or frozen source idle was used.

Generate and inspect it:

```sh
node tools/creator/make_neutral_idle.mjs
node tools/creator/inspect_animation.mjs art/parts/candidates/idle-neutral.glb
```

The generator preserves the source geometry, weights, skeleton nodes, inverse
bind matrices, and materials. It replaces the animation in the candidate file
and records the input hash inside that GLB. Repeated generation produced the
same SHA-256:

```text
57a05b8f9387ad9ee26ef0d06482e741c8790beeeb50ad9de2cd21982dbf45ea
```

The exported candidate's pelvis yaw and tilt stay at 0.000° across the diagnostic
samples. Head yaw stays at 0.000°; head tilt ranges from 0.000° to 0.350°.
Breathing reaches its two extremes at 1 and 3 seconds. Start and end poses match.

The generator checks all 121 generated frames: pelvis and leg joints have zero
drift, and all 13 ground-contact sole vertices have zero drift. Their Y values
stay within 0.00000005 source units of the ground plane. Feet retain their
0.191415-unit lateral separation. The source's slight knee bends, 7.038° left
and 4.117° right, are unchanged. These checks cover Eric's source body; the creator
discards non-hip translation and scale tracks during retargeting.

For an isolated creator preview, add `neutral: 'candidates/idle-neutral.glb'` to
the in-memory library's `anims` object and use `play('neutral')`. Calling the new
clip `idle` would engage the old 0.4-second freeze. Leave the character root yaw
fixed and compare front, side, and back at 0, 1, and 3 seconds, including close-ups
of hands against the jacket/hips and soles against the floor. Check the same clip
on Mio and during idle/walk fades.

This remains an unapproved candidate. No browser or GPU render was run for the
generation task. The arms may still need a fitting adjustment after the clothing
and Mio previews; CPU joint stability cannot establish visual comfort or rule out
intersections.
