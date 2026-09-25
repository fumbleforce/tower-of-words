"""Shot list for the 89.6 s TV edit (game/audio/music/opening-tv.mp3), method of 2026-09-25 (GUIDE): simple, flat, readable
compositions (side-on or frontal, few depth planes), strong light and a big painted sky, animated as layered cels in the engine,
with the film finish from the "Look and feel" notes. Approved: C (the monorail silhouette). Source per shot:
approved = already picked; master = new background (this batch or later); cel = moving layer cut from a master or sprite;
sprite = approved character art; drawn = made in code.
(n, time, lyric, source, what we see, staging line, how it moves)"""

SHOTS = [
    (1, '0.0–3.6', '', 'master: m-sky', 'A huge golden dawn sky over a flat sea.',
     'Camera at sea level facing the sunrise; horizon low; only sky, sun and sea.', 'Slow tilt down the tall plate; clouds drift on their own layer; the sun flares on the first hit.'),
    (2, '3.6–5.2', '', 'approved: C', 'The monorail in silhouette on its beam against the sunrise.', 'Flat side view; beam level in the lower quarter.', 'The train cel slides right.'),
    (3, '5.2–6.8', '', 'master: m-pass', 'Close, the carriages pass in front of the sun.',
     'Flat side view close to the beam; the cars fill the lower half; big sun low behind them.', 'Train cel slides fast right; light flickers through the gaps between cars.'),
    (4, '6.8–10.0', '', 'master: m-him', 'Him in the carriage, dark profile against the bright window.',
     'Flat side view inside: his head and shoulders in profile in the left third, a big window behind with sea and sunrise.', 'Light sweep over the window; dust drifts; a slow push.'),
    (5, '10.0–11.6', '', 'drawn', 'The phone\'s new-hire app: ようこそ.', 'Frontal phone screen, simple map without the odd circle.', 'Text types in on 2s.'),
    (6, '11.6–12.8', '', 'drawn', 'Small 天川 logo and the first staff credit over the sky.', 'No "opening theme" label.', 'Logo shine.'),
    (7, '12.8–16.0', '朝のモノレール 窓の外', 'master: m-window', 'The window: seat backs in silhouette, the sea far below, the sun.',
     'Frontal view of one side window from the seat opposite; horizon low in the window.', 'Sea glitter and the sky slide past behind the window mask.'),
    (8, '16.0–18.8', '', 'master: m-him (closer)', 'Closer on his profile; pillar shadows pass over him on the beat.', 'Same camera, tighter.', 'Shadow bands on the beat.'),
    (9, '18.8–21.2', '知らない街が 光ってる', 'master: m-city', 'The island city on the horizon, towers glinting in the sun.',
     'Flat side view from sea level; the skyline a band on the horizon; big sky above.', 'Glints pop on the glass on the beat; clouds drift.'),
    (10, '21.2–24.4', '', 'master: m-station', 'Arrival: the train stopped at the platform, side-on.',
     'Flat side view across the platform; the stopped train fills the middle band; morning light from the right.', 'Doors slide open (cel); light spills out.'),
    (11, '24.4–27.6', 'ポケットに IDカード', 'drawn', 'The ID card rises out of his pocket and catches the light.', 'Drawn card over a blurred crop of m-him.', 'Card slides up, glint sweeps.'),
    (12, '27.6–31.6', '', 'master: m-street', 'He walks out: the company city street, towers side by side, low sun between them.',
     'Flat frontal view down a wide street; his small figure from behind in the middle (approved design, back view).', 'He walks (cel bob); the sun flares between towers.'),
    (13, '31.6–34.0', '今日からここで 働くよ', 'approved location: gate-lobby-2103 (to be restyled to match)', 'The gate; the card taps; the light goes teal.', 'Frontal view of the gates.', 'Drawn card and glow.'),
    (14, '34.0–37.2', '', 'sprite', 'His face, eyes up; white flash on the chorus.', 'Approved design, eyes-open variant (needs approval).', 'Push in, flash.'),
    # chorus onward: planned later, one batch at a time
]
BATCH_1 = ['m-sky', 'm-pass', 'm-him', 'm-window', 'm-city', 'm-station', 'm-street']
