"""Build the public candidate/history records from local, safe receipts only."""
from pathlib import Path
import json
from datetime import datetime
ROOT=Path(__file__).resolve().parents[3]
PART='art/parts/pool-swimwear-1'
OUT=ROOT/PART
REVIEW=ROOT/'reviews/pool-swimwear-1'
ids=['kuro-b','emi','eric','carina']
names={'kuro-b':'Kuro','emi':'Emi','eric':'Eric','carina':'Carina'}
notes={
'kuro-b':'Compact bun retained after the first shape produced a ponytail. The new central fringe is more pointed than the current blunt fringe.',
'emi':'Closest facial match in the independent clothing review. Teal sports one-piece; native model and texture.',
'eric':'Seated rig defect remains: triangular calf/ankle flap and flattened far foot. Navy swim shorts. Eyes are rounder and the jaw/stubble broader than the current model. The first arm retarget was rejected and is retained in history.',
'carina':'Seated rig defect remains: smaller calf flap and broad foot. Burgundy sports one-piece. Equal-height head/hair comparison checked against the current corrected model. The front hair edge is straighter, and bare feet are broad/blocky.'}
requests=[]
for person in ['kuro',*ids]:
 for stage in ['shape','texture','rig']:
  f=OUT/'meshy'/person/(stage+'-request.json')
  if not f.exists(): continue
  d=json.loads(f.read_text()); receipt=json.loads(f.with_name(stage+'-receipt.json').read_text())
  requests.append(dict(candidate=person,stage=stage,**d,status=receipt['status']))
ledger=dict(starting_credits=85,spent_credits=sum(v['estimated_credits'] for v in requests),remaining_credits=0,
 request_settings=requests,automatic_paid_retries=False,installed=False,
 note='Five shape requests, four texture requests, four native rigs. First Kuro shape rejected before texturing. Image edits used built-in image generation, outside Meshy credits. No texture painting or geometry repair.')
(REVIEW/'credits.json').write_text(json.dumps(ledger,indent=2)+'\n')
media=[dict(image=f'{PART}/pics/{id.split("-")[0]}-a.png',caption=f'{names[id]} outfit reference edit, before Meshy. Candidate reference only.') for id in ids]
for suffix in ['preview','front','left','right','back']:
 f=OUT/'meshy/kuro'/('shape-'+suffix+'.png')
 if f.exists():media.append(dict(image=f'{PART}/meshy/kuro/{f.name}',caption='Rejected first Kuro shape: the bun became a long ponytail. Five credits; no texture or rig request on this shape.'))
options=[]
for id in ids:
 captures=sorted(f'{PART}/captures/{p.name}' for p in (OUT/'captures').glob('*-'+id+'-*.png'))
 hero=f'{PART}/captures/1366-{id}-comparison.png'
 options.append(dict(id=id,label=names[id]+' swimwear',image=hero,images=[p for p in captures if p!=hero],note=notes[id]+' Animation approval is separate: native walk/run; corrected relaxed idle; static review seat pose. Not installed.'))
files=[]
for id in ids:
 for p in sorted((OUT/'game'/id).iterdir()):
  if p.suffix in ['.glb','.webp','.json'] and p.name!='diagnostic.json':files.append(str(p.relative_to(ROOT)))
for p in sorted((OUT/'shape-comparison').glob('*.png')):media.append(dict(image=str(p.relative_to(ROOT)),caption='Equal-height actual-model proportion comparison: '+p.stem))
# Every saved failed render is accessible with its unchanged clip or labelled history image.
for folder in sorted((OUT/'failed-poses').iterdir()):
 for p in sorted(folder.glob('*.png')):
  if '-sit-body-' in p.name or ('eric-arms' in str(folder) and '-idle-body-' in p.name) or ('first-retarget' in str(folder) and '-idle-body-' in p.name):
   media.append(dict(image=str(p.relative_to(ROOT)),caption='Rejected pose attempt: '+folder.name+' / '+p.stem+'. Re-rendered from its retained clip where the original still was overwritten.'))
review=dict(title='Pool swimwear: four actual Meshy candidates',date='2026-10-07',updated=datetime.now().astimezone().isoformat(timespec='seconds'),by='Codex',status='open',issue=296,multi=True,
 question='Which swimwear models keep the characters looking like themselves?',
 links=[dict(label='Live 3D: compare current outfits, turn, walk, run and sit',href='reviews/pool-swimwear-1/viewer.html?s=pair'),
 dict(label='All reference edits, shape attempts and failed pose captures',href='reviews/pool-swimwear-1/history.html'),
 dict(label='Exact Meshy settings and 85-credit record',href='reviews/pool-swimwear-1/credits.json')]+[
 dict(label='Rejected pose history: '+a,href='reviews/pool-swimwear-1/viewer.html?s='+('eric' if a=='bad-arms' else 'pair')+'&m='+('idle' if a=='bad-arms' else 'sit')+'&attempt='+a) for a in ['first-retarget','upright-transfer','idle-based','bad-arms']],
 media=media,options=options,viewer_files=files)
(REVIEW/'review.json').write_text(json.dumps(review,indent=2)+'\n')
# Separate historical contact sheets retain all saved renders, including repeated views.
history=[]
for folder in ['pics','shape-comparison','failed-poses']:
 for p in sorted((OUT/folder).rglob('*.png')):history.append(p)
body='<!doctype html><html lang="en"><head><meta name="robots" content="noindex,nofollow"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Swimwear candidate history</title><style>body{font:16px system-ui;margin:24px;background:#f1f3f5;color:#202830}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}figure{margin:0}img{max-width:100%;height:auto}figcaption{overflow-wrap:anywhere}</style></head><body><h1>Swimwear candidate history</h1><p>All saved reference, comparison and failed pose captures. No candidate is installed. Failed poses remain available in the live viewer. Some earlier stills were recreated from the retained exact clip after their first capture was overwritten.</p><p><a href="viewer.html">Current live viewer</a> · <a href="../../bible/#review/pool-swimwear-1">Review and choose</a></p><main>'
for p in history:
 rel=str(p.relative_to(ROOT));body+=f'<figure><img loading="lazy" src="../../{rel}" alt="{p.stem}"><figcaption>{str(p.relative_to(OUT))}</figcaption></figure>'
body+='</main></body></html>\n';(REVIEW/'history.html').write_text(body)
# History images must also be included in the public media manifest.
known={m['image'] for m in review['media']}
for p in history:
 rel=str(p.relative_to(ROOT))
 if rel not in known: review['media'].append(dict(image=rel,caption='Retained attempt: '+str(p.relative_to(OUT))))
review['options'].append(dict(id='rejected-history',label='Rejected attempts, retained for comparison',image=review['media'][0]['image'],images=[m['image'] for m in review['media'][1:]],note='Reference edits, original proportion comparisons and rejected shape/pose history. This is a record, not a model proposed for installation. See the history link for per-image descriptions.'))
review['media']=[]
(REVIEW/'review.json').write_text(json.dumps(review,indent=2)+'\n')
print('review:',len(requests),'requests,',ledger['spent_credits'],'credits,',len(files),'viewer files')
