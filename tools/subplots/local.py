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
    scene_id = request.get('id','')
    selected = next((c for c in sources if scene_id.startswith('local:'+c['key']+':')),None)
    if not selected:
        raise ValueError('Unknown recipe source')
    folder = state / hashlib.sha256(scene_id.encode()).hexdigest()
    def read():
        data = recipes({'action':'read','id':scene_id})
        data['metadata'] = read_json(folder/'metadata.json',{})
        data['sourceRevision'] = data['revision']
        data['revision'] = hashlib.sha256((data['sourceRevision']+json.dumps(data['metadata'],sort_keys=True)).encode()).hexdigest()
        data['history'] = [p.name for p in sorted((folder/'history').glob('*.json'),reverse=True)][:30]
        data['draft'] = read_json(folder/'draft.json',None)
        return data
    if action == 'read':
        return read()
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
        selected_image=request.get('metadata',{}).get('image')
        promote=None
        if selected_image and selected_image!=(prior.get('metadata',{}).get('image') if restore else current['metadata'].get('image')):
            if not selected_image.get('slot'):
                raise ValueError('Choose which existing scene image to replace, then select the render again.')
            # Resolve only dashboard render outputs; no arbitrary file copy or user-owned folder traversal.
            relative=selected_image.get('file','')
            outputs=Path(config['imageOutputs']).resolve()
            source=(outputs/relative).resolve()
            if not source.is_relative_to(outputs) or not source.is_file():
                raise ValueError('The selected render is not an image-generation output')
            token=hashlib.sha256(source.read_bytes()).hexdigest()[:20]
            filename='editor-'+token+'.webp'
            target=Path(config['imageLive'])/filename
            body['imageReplacement']={'slot':selected_image['slot'],'file':'encounters/'+filename}
            promote=(source,target,token)
        prepared=recipes(body)
        if action=='validate':return {'ok':True}
        source_file=Path(selected['file'])
        if source_file.read_text()!=prepared['source']:
            raise ValueError('CONFLICT: The recipe changed while saving.')
        version=str(time.time_ns())
        backups={str(source_file):source_file.read_bytes()}
        for file in selected['outputs'] + config.get('extraBackups', []) + [str(folder/'metadata.json')]:
            p=Path(file);backups[file]=p.read_bytes() if p.exists() else None
        if promote:
            target=promote[1];backups[str(target)]=target.read_bytes() if target.exists() else None
        atomic(folder/'history'/(version+'.json'),json.dumps(current,ensure_ascii=False))
        # Keep a recovery record before touching the recipe or derived files.
        recovery=folder/'recovery'/version
        for i,(file,content) in enumerate(backups.items()):
            if content is not None:
                recovery.mkdir(parents=True,exist_ok=True);(recovery/str(i)).write_bytes(content)
        atomic(recovery/'files.json',json.dumps(list(backups)))
        try:
            if promote:
                from PIL import Image
                image,target,token=promote
                generated=Path(config['generated'])/(token+'.webp');generated.parent.mkdir(parents=True,exist_ok=True)
                if not generated.exists():
                    with Image.open(image) as im:im.convert('RGB').save(generated,'WEBP',quality=95)
                if not target.exists():
                    result=subprocess.run(['node','tools/assets/live.mjs','promote',str(generated.relative_to(root)),str(target.relative_to(root)),'--round',config['round'],'--note','Selected by the user in the subplot editor'],cwd=root,capture_output=True,text=True,timeout=60)
                    if result.returncode:raise ValueError('Image promotion failed: '+result.stderr[-500:])
            atomic(source_file,prepared['changed'])
            result=subprocess.run(selected['build'],cwd=root,capture_output=True,text=True,timeout=60)
            if result.returncode:raise ValueError('Scene rebuild failed. The source has been restored. '+result.stderr[-400:])
            retired = invalidate_voice(config, selected, backups, root, recovery)
            atomic(folder/'metadata.json',json.dumps(request.get('metadata',{}),ensure_ascii=False))
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
