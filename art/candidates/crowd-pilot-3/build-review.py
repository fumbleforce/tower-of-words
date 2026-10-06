"""Package all recovered face attempts, generated corrections and the final live 3D comparison."""
from pathlib import Path
import json
from PIL import Image,ImageDraw
root=Path('/home/jorgen/repo/japanese');p=root/'art/parts/crowd-pilot-3'
out=Path('reviews/crowd-pilot-3/review.json')
rel=lambda f:str(f.relative_to(root))
media=[]
for t in range(1,10):
 settings=[]
 for m in ('a','b'):
  f=p/'takes'/f'{m}-t{t}'/'settings.json'
  settings.append(f'{m.upper()}: '+json.dumps(json.loads(f.read_text()),separators=(',',':')))
 notes={7:'Mouth correction from built-in imagegen, transferred only through the mouth area of the UV texture.',8:'First angled hair-seam projection; rejected for overspray onto A’s forehead in the opposite view.',9:'Tighter occlusion avoids most overspray. B final; A still needed skin protection.'}
 media.append({'image':rel(p/'sheets'/f'take-{t}.webp'),'caption':f'History, take {t}. '+notes.get(t,'Saved Claude eye-paint iteration: white, iris, pupil, highlights and lash lines; B’s hair parting repainted. No mesh or rig changes.')+' Settings: '+'; '.join(settings)})
# Include A's final UV-protection attempt, with both angles.
sheet=Image.new('RGB',(1200,650),'#eceef1');d=ImageDraw.Draw(sheet)
for i,angle in enumerate(['turn','opposite']):
 sheet.paste(Image.open(p/'takes'/'a-t10'/f'{angle}.png').convert('RGB').resize((600,625)),(600*i,25));d.text((600*i+10,6),'A take 10: '+angle,fill='black')
sheet.save(p/'sheets'/'take-10.webp',quality=92)
media.append({'image':rel(p/'sheets'/'take-10.webp'),'caption':'A take 10, final: original skin-colour texels protected from the angled hair projection; the opposite hair underside uses the same generated colour. Eyes, mouth and geometry kept.'})
generation=json.loads(Path('art/candidates/crowd-pilot-3/generation.json').read_text())
for a in generation['attempts']:
 media.append({'image':a['source'],'caption':f"Source image for {a['id']}, before projecting the targeted area into the original UV texture. Built-in imagegen; transparent background false; no explicit seed/steps available. Prompt: {a['prompt']}"})
media.extend([
 {'image':rel(p/'sheets'/'faces-front.webp'),'caption':'Final live front close-ups, at one camera distance beside Kenji, Kuro, Aoi and Emi. Separate Codex critic: A 8/10, B 8/10. Eyes and mouths read clearly; large pale hair patches fixed. Some hair-edge aliasing remains visible at extreme close-up.'},
 {'image':rel(p/'sheets'/'faces-turn.webp'),'caption':'Final live three-quarter close-ups, showing their left side (image right side of the face). These are renders of the actual textured, rigged models.'},
 {'image':rel(p/'motion'/'walk-cycles.webp'),'caption':'Motion check: side views 0.133 s apart. Both models kept their round-2 Meshy rigs, skin weights, walk, run and sit clips. The corrected relaxed idle is baked on their own joint axes. Automated checks covered 24 ten-second state runs, treadmill and loop, desktop 1366×860 and phone 390×844, plus real-time walking beyond the gait stop timeout. Software GL was used while voice generation occupied the GPU; these are motion checks, not performance measurements.'}
])
media.sort(key=lambda m: 0 if '/sheets/faces-' in m['image'] or '/motion/' in m['image'] else 1)
files=[f'art/parts/crowd-pilot-3/game/{m}/{name}' for m in ('a','b') for name in ('base.webp','walk.glb','run.glb','sit.glb','idle.json')]
review={
 'title':'Crowd pilot round 3: repaired faces, walking models', 'date':'2026-10-06','updated':'2026-10-06T19:00:00+02:00','by':'Claude crowd pilot, recovered and checked by Codex','status':'open','issue':232,
 'question':'Real 3D models with repainted eyes and mouths, repaired hair seams and corrected idle posture. Independent face critic: A 8/10, B 8/10. Try both in the live viewer below. Would you use either as an office crowd model?',
 'multi':True,'media':media,
 'options':[
  {'id':'crowd-a-3','label':'crowd-a-3: office man','image':'art/parts/crowd-pilot-3/viewer-final/face-a-front.png','images':['art/parts/crowd-pilot-3/viewer-final/face-a-turn.png','art/parts/crowd-pilot-3/takes/a-t10/opposite.png'],'note':'Final A-t10. Brown irises, readable closed mouth, dark hair underside instead of grey strips. Independent face score 8/10; minor hair-edge aliasing remains close up. Existing round-2 model and Meshy rig retained. No new Meshy credits. Review candidate only.'},
  {'id':'crowd-b-3','label':'crowd-b-3: office woman','image':'art/parts/crowd-pilot-3/viewer-final/face-b-front.png','images':['art/parts/crowd-pilot-3/viewer-final/face-b-turn.png','art/parts/crowd-pilot-3/takes/b-t9/opposite.png'],'note':'Final B-t9. Blue irises, readable closed mouth and the pale hair-part strip recoloured. Independent face score 8/10; minor hair-edge aliasing remains close up. Existing round-2 model and Meshy rig retained. No new Meshy credits. Review candidate only.'}
 ],
 'links':[{'label':'Live 3D: turn, zoom, compare faces, idle, walk, run and sit','href':'reviews/crowd-pilot-3/viewer.html'},{'label':'Round 2 and its diagnostic history','href':'bible/#review/crowd-pilot-2'},{'label':'Round 1 and original models','href':'bible/#review/crowd-pilot-1'}],
 'viewer_files':files
}
out.write_text(json.dumps(review,indent=1,ensure_ascii=False)+'\n')
print(out)
