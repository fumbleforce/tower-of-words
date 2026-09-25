"""Test segment of the anime opening: intro + verse 1 lines 1-2 (0 to 21.2 s of game/audio/music/opening-tv.mp3).
Six art slots, each staged with the shot-staging skill (every field), and the cut list that uses them.
Nothing here is approved yet: Jørgen picks one candidate per slot on proto2/opening/shots.html before any animation."""

# slot id -> staging note (all fields of the skill) and candidate files under art/opening/base (name-seed.png)
SLOTS = [
    ('sky', 'Morning sky over the bay', [
        ('Story beat', 'The world before the story: a clear morning, a new start.'),
        ('Script moment', 'The song\'s first hit (0.4 s), before any lyric. Opens the opening.'),
        ('Where in the world', 'Open sky over Tokyo Bay; only the sea horizon at the bottom.'),
        ('Camera', 'High over the bay, facing east toward the sunrise; tilts down from high clouds to the horizon (a tall plate, panned top to bottom).'),
        ('Height and scale', 'Camera well above the water; the horizon is flat and far, no land or structures in frame.'),
        ('In front of the lens', 'Cumulus clouds, deep blue sky fading to warm light, the sun on the horizon, sea.'),
        ('Behind the camera', 'The mainland and the route (not shown).'),
        ('Motion', 'Camera tilt down; clouds drift slightly (parallax).'),
        ('Light', 'Sunrise, low sun ahead; warm rim on the clouds.'),
        ('Physical sense', 'No buildings, no text, no aircraft.'),
    ], [('sky-tall-11', 'Passes: sky, sun on the sea horizon, no land or structures.'), ('sky-tall-12', 'Passes; busier clouds, sun smaller.')]),
    ('bay', 'The monorail crossing the bay', [
        ('Story beat', 'He is on his way to the island he is moving to.'),
        ('Script moment', 'Intro, bar 3 (3.6 s): first sight of the train.'),
        ('Where in the world', 'The train runs on top of a concrete guideway beam on pillars in the sea, travelling right toward the island city on the right horizon.'),
        ('Camera', 'Far off to the side of the route, square-on to the beam, slightly high; slow truck right with the train.'),
        ('Height and scale', 'Beam about 15 m above the water; pillars reach down into the sea; the train is small in a wide frame.'),
        ('In front of the lens', 'Sea foreground, the beam across the frame, the train (nose on the right, last car visible), the island city under the sun on the right.'),
        ('Behind the camera', 'Open bay.'),
        ('Motion', 'Train left to right, toward the island.'),
        ('Light', 'Low sun over the island (east): backlit, sparkle on the water.'),
        ('Physical sense', 'Train on the beam, both ends visible, fixed number of cars, no aircraft or boats.'),
    ], [('bay-side2-207', 'Nose on the right, heading for the island; on the beam. Fails one check: the train runs off the left edge, so its last car is not visible.'), ('bay-side3-333', 'Nose on the right, heading for the island. Same flaw: the rear runs off the left edge. Four other seeds were rejected (nose on the left, i.e. driving away from the island, or overhead wires).')]),
    ('oncoming', 'Low angle: the train comes over us', [
        ('Story beat', 'Energy: the train rushes over the camera.'),
        ('Script moment', 'Intro, bar 4 (5.2 s), on the drum fill.'),
        ('Where in the world', 'Under the guideway, looking back along it toward the mainland; the train on top of the beam.'),
        ('Camera', 'At the foot of a pillar, looking up and back along the beam; slight roll and push, speed lines.'),
        ('Height and scale', 'Beam about 15 m overhead; the horizon at the bottom edge.'),
        ('In front of the lens', 'Underside of the beam running away diagonally, the train\'s nose coming toward and over the camera, the hazy mainland shore low on the horizon.'),
        ('Behind the camera', 'The island (not shown, not prompted).'),
        ('Motion', 'Nose toward and over the camera, heading for the island behind us.'),
        ('Light', 'The sun is behind the camera (east), so the train front is lit and no sun in the sky.'),
        ('Physical sense', 'Train sits on the beam; finite train (last car visible or clearly far away).'),
    ], [('oncoming2-216', 'Passes mostly: nose toward camera, front-lit, no sun in the sky, about four cars. The rear cars fade into the distance rather than ending clearly.'), ('oncoming2-215', 'Nose toward camera, but the train is long (seven or more cars).')]),
    ('cabin', 'The carriage, facing forward', [
        ('Story beat', 'Inside the train, early morning, nearly empty: his one-way ride in.'),
        ('Script moment', 'Intro bar 5 (6.8 s), and again under 「朝のモノレール 窓の外」 (12.8 s).'),
        ('Where in the world', 'Front car of a driverless monorail on the guideway; the beam is visible ahead through the front window, curving toward the island.'),
        ('Camera', 'Standing in the aisle at eye level, facing forward along the car.'),
        ('Height and scale', 'Carriage about 15 m above the sea: side windows show sky with the horizon in the lower third and the water far below.'),
        ('In front of the lens', 'Bench seats both sides, straps, poles, the front window with the beam ahead and the island city far away.'),
        ('Behind the camera', 'The rear of the car and the mainland (not prompted).'),
        ('Motion', 'Sunlight shapes slide across the seats as the train moves (animated).'),
        ('Light', 'Low sun ahead through the front window.'),
        ('Physical sense', 'No waves at the sill, no rails, no people; the beam ahead is single and continuous.'),
    ], [('cabin-comp-42', 'Composite (see prompt). Weak: the far end is a gangway door, so no track is visible ahead; the horizon sits mid-window rather than low. Three direct renders of a front-car view were rejected (open platform with rails, a second train).')]),
    ('mcwin', 'Him at the window', [
        ('Story beat', 'First look at him: tired, quietly hopeful, watching his new home come closer.'),
        ('Script moment', 'Intro bar 6 (8.4 s), and closer under the verse (16.0 s).'),
        ('Where in the world', 'Seated in the monorail carriage on the guideway; the train is on a gentle curve, so the beam ahead curves into view through his window.'),
        ('Camera', 'In the aisle beside him at seated eye level, three-quarter view from behind-left.'),
        ('Height and scale', 'Carriage about 15 m up: he looks down at the sea; horizon at his eye level with a wide band of water below.'),
        ('In front of the lens', 'His left profile, the side window, the beam curving ahead, the island city small on the horizon.'),
        ('Behind the camera', 'The rest of the car.'),
        ('Eyelines', 'He looks out of the window toward the island city.'),
        ('Light', 'Low sun from ahead through the window on his face.'),
        ('Physical sense', 'Approved design: fair skin, short dark-blond hair and beard, glasses, grey hoodie under a navy blazer, lanyard. No props on the sill.'),
    ], [('mc-window3-311', 'Passes: approved design, looks down at the beam curving toward the island, sun ahead.'), ('mc-window3-312', 'Same idea, closer; a stray camera sits on the sill (would be framed out).'), ('mc-window2-266', 'Good face and light, but only open sea outside: no guideway, reads like a boat.')]),
    ('pano', 'His view: the city shining', [
        ('Story beat', 'The unknown city across the water, shining.'),
        ('Script moment', '「知らない街が 光ってる」 (18.8 s).'),
        ('Where in the world', 'His point of view out of the side window; the guideway curves ahead toward the island city.'),
        ('Camera', 'Inside the carriage looking out and slightly forward (window frame not in the plate; the player draws it); slow pan with glints on the glass on the beat.'),
        ('Height and scale', 'About 15 m above the sea: looking down on the water, horizon in the upper half.'),
        ('In front of the lens', 'Sea far below, the beam on pillars curving ahead, the island city on the horizon.'),
        ('Behind the camera', 'The carriage and the mainland.'),
        ('Motion', 'The view slides as the train moves forward.'),
        ('Light', 'Low sun ahead, towers catching it.'),
        ('Physical sense', 'No train in view, one beam, no boats, no landmark towers.'),
    ], [('pano-curve-321', 'Passes: his own train and the beam curve ahead on pillars toward the island city.'), ('pano-curve-323', 'Passes; the train side is closer and larger.'), ('window-pano-221', 'City on the horizon, but no guideway in view.')]),
]

# the segment's cut list: (slot or drawn element, start bar/beat on the TV edit grid, lyric)
CUTS = [
    ('sky', (0, 0), ''), ('bay', (2, 0), ''), ('oncoming', (3, 0), ''), ('mcwin', (5, 0), ''),
    ('phone (drawn: the company phone\'s new-hire app says welcome)', (6, 0), ''), ('song title (drawn)', (7, 0), ''),
    ('cabin', (7, 3), '朝のモノレール 窓の外'), ('mcwin (closer, pillar shadows on the beat)', (9, 3), ''),
    ('pano', (11, 2), '知らない街が 光ってる'),
]
END_BAR = (13, 0)  # 21.2 s: the segment stops before the final approach, which waits for the Blender blockout
