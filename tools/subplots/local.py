"""Revisioned provider for configured local scene recipes. Invoked by the editor, not imported by the game."""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

from api import atomic, read_json

HERE = Path(__file__).resolve().parent

def locate_images(data,root):
    """Check only files explicitly referenced by this recipe; never discover user content."""
    for image in data.get('images',[]):
        relative=image.get('file','')
        image['available']=False
        for area,label in [('game','live'),('rewards','archive')]:
            base=(root/'island/private'/area).resolve()
            path=(base/relative).resolve()
            if path.is_relative_to(base) and path.is_file():
                image.update(available=True,storage=label,url='/'+str(path.relative_to(root)))
                break
    return data

def picture_copies(data, root, rewards):
    """{image id: [round files]}: for each of the scene's live pictures, the byte-identical files under the rewards
    area (live.mjs promote copies a round's file), repo-relative. Size first, then a hash, so only same-sized files
    are read. The owner's own folder is outside the rewards area and never looked at."""
    wanted = {}
    for image in data.get('images', []):
        if not image.get('available') or not image.get('url'):
            continue
        path = (root / image['url'].lstrip('/')).resolve()
        if path.is_file() and not path.is_relative_to(rewards):
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            wanted.setdefault(path.stat().st_size, {}).setdefault(digest, []).append(image.get('id'))
    found = {}
    if not wanted or not rewards.is_dir():
        return found
    for folder, dirs, files in os.walk(rewards):
        dirs[:] = [d for d in dirs if d not in ('tools', 'docs', 'node_modules') and not d.startswith('.')]
        for name in files:
            if not name.endswith(('.webp', '.png')):
                continue
            file = Path(folder) / name
            try:
                size = file.stat().st_size
            except OSError:
                continue
            if size in wanted:
                ids = wanted[size].get(hashlib.sha256(file.read_bytes()).hexdigest())
                for image_id in ids or []:
                    found.setdefault(image_id, []).append(str(file.relative_to(root)))
    return found

def picture_rounds(data, root, rewards, copies=None):
    """The round folders the scene's live pictures came from (rewards/<project>/<round>)."""
    rounds = set()
    for files in (picture_copies(data, root, rewards) if copies is None else copies).values():
        for rel in files:
            parts = (root / rel).relative_to(rewards).parts
            if len(parts) >= 3:
                rounds.add(str((rewards / parts[0] / parts[1]).relative_to(root)))
    return sorted(rounds)

def scene_status(config, config_path, root, state, recipes):
    """Where each scene stands, from what exists: its pictures in the live registry (game/live.json) or on disk, its
    lines' clips (each source's voice manifest), the normal-play entry check's result, and an unsaved draft. Keyed by
    the editor's scene id; every part of a scene shares the scene's pictures, voice and entry."""
    rows = recipes({'action': 'status'})['scenes']
    game = Path(config.get('imageLive') or root / 'island/private/game/encounters').resolve().parent
    rewards = Path(config.get('rewards') or Path(config_path).resolve().parent.parent).resolve()
    live = read_json(game / 'live.json', {})
    units = set(live.get('units', {}))
    audio = Path(config['audioRoot']) if config.get('audioRoot') else None
    unvoiced = {}
    for source in config['sources']:
        for line in read_json(Path(source['voiceManifest']), {}).get('lines', []) if source.get('voiceManifest') else []:
            if audio and line.get('id') and not (audio / (line['id'] + '.mp3')).exists():
                unvoiced[line.get('scene')] = unvoiced.get(line.get('scene'), 0) + 1
    reach = {}
    for command in config.get('checks', []):
        if command and str(command[-1]).endswith('normal-entry-check.mjs'):
            result = subprocess.run([*command, '--json'], cwd=root, capture_output=True, text=True, timeout=60)
            try:
                reach = {r['id']: r for r in json.loads(result.stdout)}
            except ValueError:
                reach = {}
    pictures = {}
    for row in rows:
        for file in row['files']:
            if (game / file).is_file():
                state_of = 'live' if str((game / file).relative_to(root)) in units else 'unregistered'
            elif (rewards / file).is_file():
                state_of = 'round'
            else:
                state_of = 'missing'
            pictures.setdefault(row['scene'], {})[file] = state_of
    out = {}
    for row in rows:
        pics = pictures.get(row['scene'], {})
        entry = reach.get(row['scene'])
        missing = sum(1 for v in pics.values() if v == 'missing')
        silent = unvoiced.get(row['scene'], 0)
        if missing:
            stage, label = 'pictures', f'{missing} picture{"s" if missing > 1 else ""} missing'
        elif entry and entry.get('unbuilt'):
            stage, label = 'waiting', 'Waits for an unbuilt gate'
        elif entry and entry.get('problem'):
            stage, label = 'entry', 'No way in during play'
        elif silent:
            stage, label = 'voice', f'{silent} line{"s" if silent > 1 else ""} not voiced'
        elif entry and entry.get('ready'):
            stage, label = 'live', 'Live in game'
        else:
            stage, label = 'out', 'Not in the game yet'
        out[row['id']] = {'stage': stage, 'label': label, 'pictures': len(pics), 'missing': missing, 'unvoiced': silent,
                          'entry': (entry or {}).get('entry') or '', 'why': '; '.join((entry or {}).get('unbuilt') or []) or (entry or {}).get('problem') or '',
                          'draft': (state / hashlib.sha256(row['id'].encode()).hexdigest() / 'draft.json').is_file()}
    return out

def invalidate_voice(config, selected, backups, root, recovery):
    """Retire stale takes after dialogue changes; never play old speech over new text."""
    manifest=selected.get('voiceManifest')
    if not manifest or not config.get('audioRoot'):
        return []
    old=json.loads(backups.get(manifest) or b'{}').get('lines',[])
    new=read_json(Path(manifest),{}).get('lines',[])
    signature=lambda row: tuple(str(row.get(k,'')) for k in ('text','speaker','emo','delivery','slow'))
    before={row['id']:signature(row) for row in old}
    after={row['id']:signature(row) for row in new}
    changed=[key for key,value in before.items() if after.get(key)!=value]
    audio=Path(config['audioRoot']); retired=[]
    for key in changed:
        if not key or '/' in key or '\\' in key:
            raise ValueError('Invalid voice id in the generated manifest')
        for suffix in ('','-carina'):
            file=audio/(key+suffix+'.mp3')
            if not file.exists():continue
            backups[str(file)]=file.read_bytes()
            (recovery/str(list(backups).index(str(file)))).write_bytes(backups[str(file)])
            atomic(recovery/'files.json',json.dumps(list(backups)))
            result=subprocess.run(['node','tools/assets/live.mjs','retire',str(file.relative_to(root))],cwd=root,capture_output=True,text=True,timeout=30)
            if result.returncode:raise ValueError('Could not retire an outdated voice clip: '+result.stderr[-300:])
            retired.append(key+suffix)
    index=audio/'index.json'
    if retired:
        ids=read_json(index,[])
        atomic(index,json.dumps([key for key in ids if key not in retired],ensure_ascii=False))
    return retired

def run(config_path, request):
    config = json.loads(Path(config_path).read_text())
    root = Path(config['root']).resolve()
    state = Path(config['state']).resolve()
    sources = config['sources']
    def recipes(body):
        result = subprocess.run(['node', str(HERE/'recipes.mjs'), str(config_path)], input=json.dumps(body),
                                capture_output=True, text=True, cwd=root, timeout=30)
        value = json.loads(result.stdout)
        if result.returncode or value.get('error'):
            raise ValueError(value.get('error','Recipe reader failed'))
        return value
    action = request['action']
    if action == 'catalog':
        return recipes(request)
    if action == 'status':
        return {'status': scene_status(config, config_path, root, state, recipes)}
    scene_id = request.get('id','')
    selected = next((c for c in sources if scene_id.startswith('local:'+c['key']+':')),None)
    if not selected:
        raise ValueError('Unknown recipe source')
    folder = state / hashlib.sha256(scene_id.encode()).hexdigest()
    def read():
        data = locate_images(recipes({'action':'read','id':scene_id}),root)
        data['metadata'] = read_json(folder/'metadata.json',{})
        data['sourceRevision'] = data['revision']
        data['revision'] = hashlib.sha256((data['sourceRevision']+json.dumps(data['metadata'],sort_keys=True)).encode()).hexdigest()
        data['history'] = [p.name for p in sorted((folder/'history').glob('*.json'),reverse=True)][:30]
        data['draft'] = read_json(folder/'draft.json',None)
        return data
    if action == 'read':
        return read()
    if action == 'pictures':
        data = read()
        rewards = Path(config.get('rewards') or Path(config_path).resolve().parent.parent).resolve()
        copies = picture_copies(data, root, rewards)
        return {'rounds': picture_rounds(data, root, rewards, copies), 'copies': copies, 'scene': data.get('scene', ''),
                'images': [{k: i.get(k) for k in ('id', 'file', 'url', 'available', 'storage')} for i in data.get('images', [])],
                'files': [i.get('file', '') for i in data.get('images', [])], 'metadata': data.get('metadata', {})}
    if action == 'history':
        version=request.get('version','')
        if not version.endswith('.json') or '/' in version or '\\' in version:
            raise ValueError('Invalid revision')
        return read_json(folder/'history'/version,None)
    if action not in ('draft','save','validate'):
        raise ValueError('Unknown recipe operation')
    state.mkdir(parents=True,exist_ok=True)
    with (state/'write.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        current=read()
        if action=='draft':
            if request.get('discard'):
                (folder/'draft.json').unlink(missing_ok=True);return {'ok':True,'draft':False}
            atomic(folder/'draft.json',json.dumps(request,ensure_ascii=False));return {'ok':True,'draft':True}
        if request.get('revision')!=current['revision']:
            raise ValueError('CONFLICT: This recipe changed outside the editor. Reload before saving.')
        body={**request,'action':'prepare','revision':current['sourceRevision']}
        restore=request.get('restoreVersion')
        if restore:
            if not restore.endswith('.json') or '/' in restore or '\\' in restore:
                raise ValueError('Invalid revision')
            prior=read_json(folder/'history'/restore,None)
            if not prior:raise ValueError('The revision is unavailable')
            body['restoreImages']=prior.get('images',[])
        metadata=request.get('metadata',{})
        previous=prior.get('metadata',{}) if restore else current['metadata']
        selections=dict(metadata.get('images',{}))
        legacy=metadata.get('image')
        if legacy and legacy!=previous.get('image'):
            selections.setdefault(legacy.get('slot',''),legacy)
        promotions=[]
        replacements=[]
        # picture beats added in the editor ({newPicture, imageSlot 'new:...'}): their pick becomes the beat's file
        added={}
        def walk(steps):
            for step in steps or []:
                if isinstance(step,dict):
                    if step.get('newPicture') and step.get('imageSlot'):added[step['imageSlot']]=step
                    for key in ('then','else','sequence'):walk(step.get(key))
        if isinstance(body.get('steps'),list):
            body['steps']=json.loads(json.dumps(body['steps']));walk(body['steps'])
        for slot,selected_image in selections.items():
            if slot.startswith('new:') and slot not in added:
                continue  # its beat was deleted
            if selected_image==previous.get('images',{}).get(slot):
                continue
            if not slot:
                raise ValueError('Choose which scene image to replace first.')
            relative=selected_image.get('file','')
            outputs=Path(config['imageOutputs']).resolve()
            source=(outputs/relative).resolve()
            if not source.is_relative_to(outputs) or not source.is_file():
                raise ValueError('The selected render is not an image-generation output')
            token=hashlib.sha256(source.read_bytes()).hexdigest()[:20]
            filename='editor-'+token+'.webp'
            target=Path(config['imageLive'])/filename
            if slot in added:added[slot]['file']='encounters/'+filename
            else:replacements.append({'slot':slot,'file':'encounters/'+filename})
            promotions.append((source,target,token))
        if replacements:
            body['imageReplacements']=replacements
        prepared=recipes(body)
        remap=prepared.get('imageRemap')
        if remap is not None:
            metadata=json.loads(json.dumps(metadata))
            for field in ('images','compositions'):
                if field not in metadata:continue
                metadata[field]={remap.get(key,key):{**value,**({'slot':remap[key]} if field=='images' and key in remap else {}),**({'imageSlot':remap[key]} if field=='compositions' and key in remap else {})} for key,value in metadata[field].items() if key in remap or key=='scene'}
            for value in metadata.get('images',{}).values():value['applied']=True
            if metadata.get('image',{}).get('slot') in remap:
                metadata['image']['slot']=remap[metadata['image']['slot']]
            elif 'image' in metadata:
                del metadata['image']
        if action=='validate':return {'ok':True}
        source_file=Path(selected['file'])
        if source_file.read_text()!=prepared['source']:
            raise ValueError('CONFLICT: The recipe changed while saving.')
        version=str(time.time_ns())
        backups={str(source_file):source_file.read_bytes()}
        for file in selected['outputs'] + config.get('extraBackups', []) + [str(folder/'metadata.json')]:
            p=Path(file);backups[file]=p.read_bytes() if p.exists() else None
        for _,target,_ in promotions:
            backups[str(target)]=target.read_bytes() if target.exists() else None
        atomic(folder/'history'/(version+'.json'),json.dumps(current,ensure_ascii=False))
        # Keep a recovery record before touching the recipe or derived files.
        recovery=folder/'recovery'/version
        for i,(file,content) in enumerate(backups.items()):
            if content is not None:
                recovery.mkdir(parents=True,exist_ok=True);(recovery/str(i)).write_bytes(content)
        atomic(recovery/'files.json',json.dumps(list(backups)))
        try:
            for image,target,token in promotions:
                from PIL import Image
                generated=Path(config['generated'])/(token+'.webp');generated.parent.mkdir(parents=True,exist_ok=True)
                if not generated.exists():
                    with Image.open(image) as im:im.convert('RGB').save(generated,'WEBP',quality=95)
                if not target.exists():
                    result=subprocess.run(['node','tools/assets/live.mjs','promote',str(generated.relative_to(root)),str(target.relative_to(root)),'--round',config['round'],'--note','Selected by the user in the subplot editor'],cwd=root,capture_output=True,text=True,timeout=60)
                    if result.returncode:raise ValueError('Image promotion failed: '+result.stderr[-500:])
            atomic(source_file,prepared['changed'])
            result=subprocess.run(selected['build'],cwd=root,capture_output=True,text=True,timeout=60)
            if result.returncode:raise ValueError('Scene rebuild failed. The source has been restored. '+result.stderr[-400:])
            for command in config.get('checks',[]) + selected.get('checks',[]):
                result=subprocess.run(command,cwd=root,capture_output=True,text=True,timeout=60)
                if result.returncode:
                    raise ValueError('Scene validation failed. The source has been restored. '+(result.stderr or result.stdout)[-400:])
            retired = invalidate_voice(config, selected, backups, root, recovery)
            atomic(folder/'metadata.json',json.dumps(metadata,ensure_ascii=False))
        except Exception:
            for file,content in backups.items():
                p=Path(file)
                if content is None:p.unlink(missing_ok=True)
                else:
                    p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(content)
            raise
        (folder/'draft.json').unlink(missing_ok=True)
        result = read()
        result['warnings'] = [f'{len(retired)} outdated voice clips were retired. The edited lines will stay silent until new takes are made.'] if retired else []
        return result

if __name__=='__main__':
    try:print(json.dumps(run(sys.argv[1],json.load(sys.stdin)),ensure_ascii=False))
    except Exception as e:print(json.dumps({'error':str(e)}));sys.exit(1)
