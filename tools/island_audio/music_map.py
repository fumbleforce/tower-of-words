"""Placeholder music for the island slice: the loops already in the old game (legacy/game/audio/music: office, calm, night, lively, made
with Lyria, plus the YuE2 opening theme), copied to Ogg Vorbis for Godot and mapped to the slice's beats. Nothing new is generated.
Writes legacy/island/godot/assets/audio/music/<track>.ogg and music/map.json. Run: python3 tools/island_audio/music_map.py"""
import json, os, subprocess

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = f'{REPO}/legacy/game/audio/music'
OUT = f'{REPO}/legacy/island/godot/assets/audio/music'

TRACKS = {
    'calm': ('calm.mp3', 'Calm morning city pop (Lyria loop from the old game, 32.8 s)', True),
    'office': ('office.mp3', 'Lazy lo-fi for the basement office (Lyria loop from the old game, 32.8 s)', True),
    'lively': ('lively.mp3', 'Upbeat party pop (Lyria loop from the old game, 32.8 s)', True),
    'night': ('night.mp3', 'Late-night jazz (Lyria loop from the old game, 32.8 s)', True),
    'opening_tv': ('opening-tv.mp3', 'The opening theme, TV edit (YuE2, "Mastered: softer", cut to 89.6 s by tools/opening/tv_edit.py)', False),
}

# beat id (legacy/island/godot/data/placeholder) and storyboard screens -> track, volume in dB relative to the music bus, and why
MAP = [
    ('title', 'title screen', 'opening_tv', 0, 'the plan: the opening theme plays on the title screen'),
    ('arrival', 'A01 to A04, the plaza at 8:40', 'calm', -4, 'first morning on the island; under the monorail and gulls'),
    ('gate', 'G01, G02, the lobby', 'calm', -6, 'continues from the plaza, lower under the lobby murmur'),
    ('lift', 'L01, L02, the lift', 'calm', -10, 'continues, nearly gone inside the lift'),
    ('b2', 'B01, O01 to O03, the basement', 'office', -4, 'the basement office; B01 can start with only the fluorescent buzz'),
    ('copyroom', 'C01 to C06, the copy room', None, 0, 'no music: the copier and the room tone carry the first command'),
    ('mou', 'O04, V01, V02', 'office', -4, 'back in the office'),
    ('afternoon', 'P01, the three cards', 'office', -2, 'the montage'),
    ('party', 'K01 to K04, K06 to K08, the karaoke room', 'lively', -6, 'party chatter over it; stops for the song (K05 plays the karaoke track)'),
    ('party:R01', 'R01, the karaoke corridor', 'lively', -14, 'muffled through the wall: a low-pass on the music bus, with amb_karaoke'),
    ('party:street', 'K08 outside', 'night', -6, 'the walk home that turns back to the office'),
    ('night', 'N01, N02, the lobby and lift at night', 'night', -8, 'quiet'),
    ('night:dark', 'N03 to N06, B2 in the dark', None, 0, 'no music: dark and silent until the lights come back'),
    ('night:wake', 'N07, 全部、動け', 'wake_sting', 0, 'the plan asks for a short sting; placeholder is the karaoke chorus (see song/), then the machines'),
    ('night:rei', 'N08, Rei in the lift', 'night', -10, 'quiet'),
    ('dorm', 'H01 to H03, room 203', 'night', -8, 'end of the day'),
    ('day2', 'D01, D02', 'office', -4, 'the next morning; stop it for the last beat of D02'),
    ('day2:end', 'D02 "To be continued"', 'opening_tv', -4, 'the numbers and the rating card'),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    tracks = {}
    for k, (f, desc, loop) in TRACKS.items():
        dst = f'{OUT}/{k}.ogg'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{SRC}/{f}', '-c:a', 'libvorbis', '-q:a', '5', '-ar', '44100', dst], check=True)
        dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst],
                                   capture_output=True, text=True).stdout.strip())
        tracks[k] = {'file': f'res://assets/audio/music/{k}.ogg', 'desc': desc, 'seconds': round(dur, 2), 'loop': loop,
                     'source': f'legacy/game/audio/music/{f}', 'placeholder': True}
    tracks['wake_sting'] = {'file': 'res://assets/audio/music/wake_sting.ogg', 'desc': 'N07 sting: the chorus of the karaoke song, faded (song_build.py)',
                            'loop': False, 'placeholder': True}
    json.dump({'note': ('Placeholder music map for the island slice, waiting for Jørgen. Tracks are the old game\'s loops (no new music). '
                        'The Lyria loops were made to crossfade into themselves (the old game did that); set loop on the stream or crossfade two players. '
                        'volume_db is relative to the music bus.'),
               'tracks': tracks,
               'scenes': [{'beat': b, 'where': w, 'track': t, 'volume_db': v, 'why': why} for b, w, t, v, why in MAP]},
              open(f'{OUT}/map.json', 'w'), ensure_ascii=False, indent=1)
    print('music map written', len(tracks), 'tracks')


if __name__ == '__main__':
    main()
