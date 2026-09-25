"""Cut sheet for the anime opening, timed to the TV-size edit game/audio/music/opening-tv.mp3 (tools/opening/tv_edit.py).
Writes proto2/opening/cuts.json (read by the player) and game/notes/opening-cutsheet.md (readable table with a staging note per shot).
Times are (bar, beat) on the edit's grid: 150 BPM, bar = 1.6 s. Edit layout: bars 0-40 intro/verse 1/chorus, bars 41-48 verse 2
(lines 1-2), bars 49-54 the chorus's last line again, then a 1.2 s tail.
Staging (shot-staging skill): the monorail carries him to the island he is moving to, so it always travels toward the island;
the island lies east under the low morning sun (shots facing it are backlit, shots facing back to the mainland are front-lit).
Run: python3 tools/opening/cutsheet.py"""
import json, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
A = json.load(open(os.path.join(ROOT, 'art', 'opening', 'audio', 'tv_map.json')))
BEATS = A['beats']


def B(bar, beat=0):
    i = bar * 4 + beat
    return BEATS[i] if i < len(BEATS) else BEATS[-1] + (i - len(BEATS) + 1) * 0.4


# id, (bar, beat), section, lyric, what the shot says, staging (camera / in front / behind / motion / eyeline / light)
SHOTS = [
    ('sky', (0, 0), 'intro', '', 'Morning. The world before the story: sky to sea horizon.',
     'Camera over the bay tilting down from high clouds to the horizon; sun low on the sea; nothing behind the camera shown.'),
    ('bay', (2, 0), 'intro', '', 'The monorail crossing the bay toward the island city.',
     'Camera far off to the side, square-on to the beam; train on top of the beam, nose right, travelling right toward the island on the right horizon; backlit by the sun over the island.'),
    ('oncoming', (3, 0), 'intro', '', 'Low angle: the train comes over us.',
     'Camera at the foot of a pillar looking up and back along the beam toward the mainland; the nose comes toward and over the camera; the island is behind the camera, not shown; sun behind camera, front-lit train.'),
    ('streak', (3, 2), 'intro', '', 'Whip into the window view.',
     'Inside, facing a side window: the bay and the distant island city blur past (window-view plate, no train or beam in it).'),
    ('cabin', (4, 0), 'intro', '', 'The carriage, nearly empty, early.',
     'Camera in the aisle looking forward along the car to the front window; the sun ahead (east, the island); light bands on the seats; side windows show sea.'),
    ('mcwin1', (5, 0), 'intro', '', 'First look at him.',
     'Camera in the aisle, three-quarter from behind-left; he looks out of the side window at the island city; low sun from ahead on his face.'),
    ('pillars', (6, 0), 'intro', '', 'Beat cuts: his luggage (he is moving here), sea glitter, the beam ahead, a glint on the towers.',
     'Luggage: camera at knee height in the aisle facing the seat; suitcase and backpack on the floor. Sea: tight on the water. Beam ahead: forward view. Towers: window view.'),
    ('songtitle', (7, 0), 'intro', '', 'Song title card.', 'Graphic card over soft sky.'),
    ('window', (7, 3), 'verse1', '朝のモノレール 窓の外', 'Outside the window.',
     'Carriage interior facing forward; the bay scrolls past in the side windows (separate view plate behind the window mask), faster than the carriage moves.'),
    ('mcwin2', (9, 3), 'verse1', '', 'Closer on him; pillar shadows pass over his face on the beat.',
     'Same camera as mcwin1, tighter; shadow bands move across in the direction of travel (the train passes pillars).'),
    ('pano', (11, 2), 'verse1', '知らない街が 光ってる', 'The unknown city shining across the water.',
     'His point of view out of the side window: sea below, the island city on the horizon, glints on the glass on the beat. No train, no beam.'),
    ('approach', (13, 0), 'verse1', '', 'Closing in on the island.',
     'Forward view from the front of the train: the beam runs straight ahead into the island city; slow push = the train moving forward.'),
    ('card', (15, 0), 'verse1', 'ポケットに IDカード', 'He pulls the new ID card from his pocket.',
     'Close-up on his hand at the blazer pocket; rack focus; a glint sweeps the blank card.'),
    ('cardflip', (17, 0), 'verse1', '', 'Insert: the card itself (天川, his photo, 新人).', 'Graphic insert, card flips toward camera over the blurred blazer.'),
    ('station', (18, 0), 'verse1', '', 'Arrival at the island station.',
     'Camera on the island platform looking along the stopped three-car train behind glass platform doors (straddle beam, no rails); doors open; towers beyond the platform end.'),
    ('gate', (19, 1), 'verse1', '今日からここで 働くよ', 'Through the security gate: the card taps, the light goes teal.',
     'Camera at eye level close to the ID gates, facing into the company city; card slides in from the right to the reader.'),
    ('towerup', (21, 0), 'verse1', '', 'He looks up: the tower rises into the sun. Build to the chorus.',
     'Worm\'s-eye view up a glass tower on the island; sun at the top edge.'),
    ('mcface', (22, 0), 'verse1', '', 'His face, eyes up; white flash on the chorus downbeat.', 'Approved sprite, eyes-open variant, over soft sky.'),
    ('skyline', (23, 0), 'chorus', 'はじめまして 新しい街', 'The reveal: the whole island company city.',
     'Camera low over the water beside the route, facing the island; the beam curves in from the left foreground; sun behind the towers; no train.'),
    ('overhead', (25, 0), 'chorus', '', 'The train again, speed lines, whip.', 'Same staging as the oncoming shot.'),
    ('mcpose', (26, 0), 'chorus', '', 'Pose reveal: the new hire.', 'Graphic card; approved sprite (eyes open).'),
    ('kotoba', (27, 1), 'chorus', '言葉が僕の 魔法になる', 'Words become his magic: ことば and まほう draw themselves in light around him.',
     'Graphic, dark teal; sprite lit from below by the glyphs.'),
    ('kanaflow', (29, 2), 'chorus', '', 'A stream of kana wipes to the copy room.', 'Graphic.'),
    ('copy', (31, 0), 'chorus', '小さな「手伝って」で', 'The copy room: てつだって glows, the copier wakes, pages fly.',
     'Camera just inside the door facing the copier on the back wall; windowless, fluorescent light; pages fly out toward camera-left.'),
    ('emi', (33, 0), 'chorus', '', 'Emi, the team leader, through flying paper.', 'Graphic card; approved sprite.'),
    ('moving', (35, 1), 'chorus', '世界が少し 動き出す', 'Beat montage: things start to move (gate, elevator doors, platform, train, glint, pages, city).', 'Reuses the staged plates.'),
    ('baywide', (37, 0), 'chorus', '', 'Wide again: the train crossing to the island, pulling back.', 'Same staging as the bay shot.'),
    ('mcsmile', (39, 0), 'chorus', '', 'He watches the city; light washes the frame.', 'Same camera as mcwin1.'),
    ('basement', (41, 0), 'verse2', '地下の部屋に ゲームの音', 'The basement office.',
     'Approved basement office plate: camera in the doorway; windowless except a high frosted light well; fluorescent flicker.'),
    ('miogame', (42, 2), 'verse2', '', 'Mio gaming, monitor light changing on the beat.',
     'Camera behind her chair facing her monitors; her face not visible; light from the screens onto her.'),
    ('mio', (44, 0), 'verse2', '', 'Mio pose reveal.', 'Graphic card; approved sprite.'),
    ('emilaugh', (45, 1), 'verse2', 'リーダーは笑って「いいね」って', 'Emi laughs: いいね.', 'Graphic sunburst; approved laughing sprite.'),
    ('rei', (47, 2), 'verse2', '', 'Rei, Sales.', 'Graphic card; approved sprite.'),
    ('button', (49, 0), 'final', '世界が少し 動き出す', 'He presses the elevator button on the vocal: the world starts to move.',
     'Close-up on the call button at hand height; his finger from the right; ring of light on the press.'),
    ('doors', (50, 0), 'final', '', 'The doors open onto light.', 'Camera facing the elevator doors in the lobby; light spills toward camera.'),
    ('silhouettes', (51, 0), 'final', '', 'The cast in a row against the sunrise, one per half-beat.', 'Graphic; approved sprites as silhouettes with rim light.'),
    ('reveal', (52, 0), 'final', '', 'The row fills with colour, left to right.', 'Graphic.'),
    ('stairs', (53, 0), 'final', '', 'He climbs toward the sky.',
     'Camera a few steps below him, looking up the white outdoor stairs between towers; he is seen from behind, climbing away from camera toward the sky.'),
    ('logo', (54, 0), 'end', '', '天川 / AMAKAWA lands on the last downbeat and holds.', 'Sky; logo.'),
]
END = A['duration']
FULL = SHOTS
# Test segment (Jørgen, 2026-09-25): intro + verse 1 lines 1-2 only, until the art is picked on proto2/opening/shots.html.
SEGMENT = [
    ('sky', (0, 0), 'intro', '', 'Morning sky over the bay, tilt down to the horizon.', 'See tools/opening/segment.py (slot sky).'),
    ('bay', (2, 0), 'intro', '', 'The monorail crossing the bay toward the island.', 'Slot bay.'),
    ('oncoming', (3, 0), 'intro', '', 'Low angle: the train comes over us.', 'Slot oncoming.'),
    ('mcwin1', (5, 0), 'intro', '', 'Him at the window.', 'Slot mcwin.'),
    ('phone', (6, 0), 'intro', '', 'The company phone\'s new-hire app: ようこそ, the island map, his dorm, the ID card.', 'Drawn in code.'),
    ('songtitle', (7, 0), 'intro', '', 'Song title card.', 'Drawn in code.'),
    ('window', (7, 3), 'verse1', '朝のモノレール 窓の外', 'The carriage facing forward, light moving across the seats.', 'Slot cabin.'),
    ('mcwin2', (9, 3), 'verse1', '', 'Closer on him; pillar shadows pass on the beat.', 'Slot mcwin.'),
    ('pano', (11, 2), 'verse1', '知らない街が 光ってる', 'His view: the city shining across the water.', 'Slot pano.'),
    ('end', (13, 0), 'end', '', 'Segment ends (the final approach waits for the Blender blockout).', ''),
]


def build(SHOTS):
    out = []
    for i, (sid, (bar, beat), sec, lyric, desc, stage) in enumerate(SHOTS):
        s = 0.0 if i == 0 else B(bar, beat)
        e = B(*SHOTS[i + 1][1]) if i + 1 < len(SHOTS) else (B(bar, beat) + 1.6 if sid == 'end' else END)
        out.append({'n': i + 1, 'id': sid, 'start': round(s, 3), 'end': round(e, 3), 'section': sec, 'lyric': lyric, 'desc': desc,
                    'staging': stage, 'bar': bar, 'beat': beat})
    return out


if __name__ == '__main__':
    import sys
    full = '--full' in sys.argv
    cuts = build(FULL if full else SEGMENT)
    d = os.path.join(ROOT, 'proto2', 'opening')
    os.makedirs(d, exist_ok=True)
    json.dump({'duration': END if full else cuts[-1]['end'], 'beats': BEATS, 'downbeats': A['downbeats'], 'cuts': cuts, 'audio': 'opening-tv.mp3'},
              open(os.path.join(d, 'cuts.json'), 'w'), ensure_ascii=False)
    rows = ['| # | Time | Bar | Section | Lyric | Shot | Staging |', '| --- | --- | --- | --- | --- | --- | --- |']
    for c in cuts:
        rows.append(f"| {c['n']} | {c['start']:.2f}–{c['end']:.2f} | {c['bar']}.{c['beat'] + 1} | {c['section']} | {c['lyric']} | {c['desc']} | {c['staging']} |")
    md = ('# Opening cut sheet\n\nGenerated by tools/opening/cutsheet.py from the beat grid of the TV-size edit '
          f'game/audio/music/opening-tv.mp3 ({END:.1f} s, 150 BPM, bar = 1.6 s, {len(cuts)} shots). The edit is intro, verse 1 and chorus, '
          'verse 2 lines 1–2, then the chorus\'s last line again for the logo. Splices are on bar lines with 25 ms crossfades (tools/opening/tv_edit.py).\n\n'
          'Staging rule: the monorail carries him to the island he is moving to, so it always travels toward the island. The island lies east under '
          'the low morning sun: shots facing it are backlit, shots facing back to the mainland are front-lit. Nothing behind the camera is prompted.\n\n'
          + '\n'.join(rows) + '\n')
    if full:
        open(os.path.join(ROOT, 'game', 'notes', 'opening-cutsheet.md'), 'w').write(md)
    print(len(cuts), 'shots', END)
