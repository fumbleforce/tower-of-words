"""Publish retained native frames as Showcase WebP copies; source PNGs and rejected attempts remain intact."""
from pathlib import Path
import json, re, shutil
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
root=Path(__file__).resolve().parents[3]
name='pool-swimwear-20261007';dest=root/'bible/shots/showcase'/name;dest.mkdir(parents=True,exist_ok=True)
sections={};tasks=[]
for source,prefix in [(root/'game3d/shots/pool-outfits','pool'),(Path(__file__).parent,'diagnostic')]:
 for path in sorted(source.rglob('*.png')):
  relative=path.relative_to(source);key=re.sub('[^a-z0-9-]+','-',prefix+'-'+str(relative.with_suffix('')).lower());target=dest/(key+'.webp')
  group=prefix+' / '+str(relative.parent)
  sections.setdefault(group,[]).append({'id':key,'image':str(target.relative_to(root)),'caption':path.stem.replace('-',' ')})
  tasks.append((path,target))
def convert(pair):
 source,target=pair
 if target.exists() and target.stat().st_mtime>=source.stat().st_mtime:return
 with Image.open(source) as image:image.save(target,format='WEBP',quality=90,method=5)
with ThreadPoolExecutor(max_workers=4) as executor:list(executor.map(convert,tasks))
links=[]
for attempt in ['ground4','stance18']:
 for who in ['1366-eric','390-carina']:
  source=root/'game3d/shots/pool-outfits'/attempt/(who+'-strides-tail.webm');target=dest/(attempt+'-'+source.name)
  if source.exists():shutil.copyfile(source,target);links.append({'label':attempt+' '+who+' actual pool strides'+(' (rejected bob)' if attempt=='ground4' else ''),'href':str(target.relative_to(root))})
notes={
 'runner1':'Retained early attempt. The old water checkpoint name timed out; seated flags alone did not establish body contact.',
 'runner3':'Rejected Continue pose: prior water overlays pulled the seated bodies down through the bench. Fixed in runner4 onward.',
 'ground1':'Before grounding correction: measurable sole penetration on the deck.',
 'ground2':'Grounded clips; transition blends still penetrated. Superseded by ground3 and ground4.',
 'ground3':'Actual pool dry walk/run after the local blend correction. Head and sole motion remain visible for review.',
 'ground4':'Rejected whole-body grounding: sole clearance passed, but Eric stands on pointed toes with excessive head bob. Complete source video retained.',
 'stance16':'Support-foot candidate, retained with a failed late Eric run capture that leaves the frame.',
 'stance17':'Exact tracking corrected the missing-actor frame, but the strict full-body margin assertion failed.',
 'stance18':'Current support-foot candidate with run flight preserved. Exact diagnostic tracking and a wider constant lens keep every sampled body corner within the viewport. Actual start/stop blends are retained.',
 'runner6':'Current selected-body source: actual Runner water and bench title Continue for both protagonists, with deformed seat contact and cleared water poses.',
 'head-phases-17':'Current candidate at original measured head extrema. Source pelvis/head tracks are unchanged; compare with rejected head-phases-10.',
 'lifecycle1':'First locker/shower/change-back route. Seat contact passed before reload; early desktop framing cropped hair.',
 'lifetime1':'Cancellation after the actual locker change and optional-model-download failure were exercised.',
 'revisit1':'Actual pool → sports ground → cached pool, with live animations on return.',
 'runner4':'Corrected water-to-bench checkpoint cleanup and full-body seat contact after title Continue.',
 'runner5':'Water and bench title Continue for both protagonists, including current grounding and owned camera.',
 'ankle-weights-1':'Rejected weight smoothing; original weights were retained.',
 'ankle-and-seat-3':'Rejected weight/seat combination; lower-leg silhouette remained poor.',
 'weights-6':'Rejected combined weight treatment; no useful improvement.',
 'weights-9':'Rejected weight comparison; original selected weights retained.',
 'head-phases-10':'Same diagnostic lens at measured head-height extrema; exposes the Eric bob increase rather than hiding it.',
}
ordered=sorted(sections,key=lambda group:(0 if any(x in group for x in ['runner6','stance18','head-phases-17','revisit1']) else 1,group))
entry={'title':'Selected pool swimwear and motion checks','date':'2026-10-07','by':'codex-exec:conversation-camera-review','caption':'The selected Kuro B, Emi, Eric and Carina appearances at the pool, with locker changes, Continue and retained motion-repair attempts.','sections':[{'title':group,'caption':next((v for k,v in notes.items() if k in group),'Retained native diagnostic or earlier integration attempt; see the integration note for its scope.'),'images':sections[group]} for group in ordered],'links':links+[{'label':'Motion and integration evidence','href':'notes/pool-swimwear-integration.md'}]}
folder=root/'showcase'/name;folder.mkdir(parents=True,exist_ok=True);(folder/'entry.json').write_text(json.dumps(entry,ensure_ascii=False,indent=2)+'\n')
print('Showcase:',len(tasks),'frames',len(sections),'sections',len(links),'video links')
