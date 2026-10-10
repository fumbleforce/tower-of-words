"""Install a local recipe configuration. Reads no scene content and never touches user-owned files."""
import json
from pathlib import Path
import sys

root = Path(sys.argv[1] if len(sys.argv)>1 else Path(__file__).resolve().parents[2]).resolve()
base = root / 'island/private'
rewards = base / 'rewards'
config = {
    'root': str(root), 'state': str(rewards/'tools/subplot-editor-state'),
    'imageOutputs': str(base/'imagegen/outputs'), 'imageLive': str(base/'game/encounters'),
    'generated': str(rewards/'library/subplot-editor-1'), 'round': 'library/subplot-editor-1',
    'audioRoot': str(base/'audio'),
    'extraBackups': [str(base/'audio/index.json'), str(base/'game/live.json')],
    'sources': [
        {'key':'opening','label':'Opening encounters','file':str(rewards/'tools/day1-scenes.src.mjs'),
         'build':['node',str(rewards/'tools/day1-scenes.src.mjs')],
         'voiceManifest':str(rewards/'lines.json'),
         'outputs':[str(rewards/'sequences.json'),str(base/'plugins/viewer-scenes.js'),str(rewards/'lines.json')]},
        {'key':'encounters','label':'Encounters and peeks','file':str(rewards/'tools/days-scenes.src.mjs'),
         'build':['node',str(rewards/'tools/days-scenes.src.mjs')],
         'voiceManifest':str(rewards/'lines-days.json'),
         'outputs':[str(base/'plugins/days-data.js'),str(base/'plugins/viewer-scenes.js'),str(rewards/'sequences.json'),str(rewards/'lines-days.json'),str(rewards/'docs/days-picture-briefs.md')]},
    ],
}
for source in config['sources']:
    if not Path(source['file']).is_file():
        sys.exit('Expected authored scene sources are missing. No configuration written.')
path=rewards/'tools/subplot-editor.json'
if path.exists():
    sys.exit('Local configuration already exists; kept unchanged.')
path.write_text(json.dumps(config,indent=2)+'\n')
print('Local recipe adapter configured. No scenes, images or voice clips were changed.')
