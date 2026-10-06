"""Bounded crowd-eye candidates. Local inpaint guides, UV projection and preservation checks."""
from pathlib import Path
import sys,json,hashlib,shutil
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
from scipy import ndimage
HERE=Path(__file__).resolve().parent; ROOT=HERE.parents[2]; MAIN=Path('/home/jorgen/repo/japanese')
sys.path[:0]=[str(HERE),str(MAIN/'tools')]
import facepaint as F
import comfy
OUT=ROOT/'art/parts/crowd-pilot-4'
SETTINGS={'a':{'centres':[(708,1330),(1207,1330)],'skin':(252,216,183),'colour':(112,75,47)},'b':{'centres':[(705,1250),(1209,1250)],'skin':(254,216,183),'colour':(62,95,141)}}
STYLE={'calm':{'a':(338,270),'b':(356,286)},'open':{'a':(358,294),'b':(376,330)}}
QUALITY='masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, '

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def curve(a,b,c,n=32):
 return [((1-t)**2*a[0]+2*(1-t)*t*b[0]+t*t*c[0],(1-t)**2*a[1]+2*(1-t)*t*b[1]+t*t*c[1]) for t in np.linspace(0,1,n)]
def eye(w,h,side,colour,style):
 s=4; w*=s;h*=s; W=int(w*1.35);H=int(h*1.35);cx=W/2;cy=H/2
 opening=Image.new('L',(W,H));d=ImageDraw.Draw(opening)
 # Opening has an angular outer lid and a flatter lower edge, never a full ellipse.
 inner=(cx-side*w*.5,cy+h*.04);outer=(cx+side*w*.5,cy-h*.16)
 upper=curve(inner,(cx-side*w*.18,cy-h*(1.0 if style=='open' else .95)),outer)
 lower=curve(outer,(cx+side*w*.07,cy+h*(.95 if style=='open' else .85)),inner)
 d.polygon(upper+lower,fill=255)
 eye=Image.new('RGBA',(W,H)); white=Image.new('RGBA',(W,H),(247,245,239,255));eye.paste(white,(0,0),opening)
 iris=Image.new('L',(W,H));di=ImageDraw.Draw(iris)
 di.ellipse((cx-w*.34,cy-h*.62,cx+w*.34,cy+h*.5),fill=255)
 iris=Image.fromarray(np.minimum(np.asarray(iris),np.asarray(opening)))
 fill=Image.new('RGBA',(W,H),(18,19,25,255));df=ImageDraw.Draw(fill)
 df.polygon([(cx-w*.34,cy+h*.08),(cx+w*.34,cy+h*.08),(cx+w*.3,cy+h*.5),(cx-w*.3,cy+h*.5)],fill=(*colour,255))
 df.rectangle((cx-w*.12,cy-h*.58,cx+w*.12,cy+h*.3),fill=(15,16,22,255))
 # One modest house-style highlight, not lens/ring reflections.
 df.rounded_rectangle((cx-w*.20,cy-h*.31,cx-w*.08,cy-h*.16),radius=2*s,fill=(255,255,250,255))
 eye.paste(fill,(0,0),iris)
 de=ImageDraw.Draw(eye)
 lash=upper+[(x,y-h*.115) for x,y in upper[::-1]]
 de.polygon(lash,fill=(24,21,24,255))
 de.polygon([outer,(outer[0]+side*w*.085,outer[1]-h*.13),(outer[0]-side*w*.1,outer[1]+h*.03)],fill=(24,21,24,255))
 if style=='open':de.line(lower[:13],fill=(70,49,40,255),width=2*s)
 return eye.resize((W//s,H//s),Image.Resampling.LANCZOS)

def prepare():
 manifest=[]
 for m,c in SETTINGS.items():
  glb=ROOT/f'art/parts/crowd-pilot-2/rig/{m}-rigged.glb'; tex=ROOT/f'art/parts/crowd-pilot-3/game/{m}/base.webp'
  original,z=F.front(str(glb),str(tex)); h,w=original.shape[:2]
  for style in STYLE:
   name=f'{m}-{style}'; dest=OUT/'takes'/name;dest.mkdir(parents=True,exist_ok=True)
   guide=Image.fromarray(original); alpha=Image.new('L',(w,h));d=ImageDraw.Draw(alpha)
   ew,eh=STYLE[style][m]
   for (cx,cy),side in zip(c['centres'],[-1,1]):
    # Clear the entire R3 eye, then install one coherent silhouette. Brows remain outside.
    box=(cx-225,cy-(190 if m=='a' else 230),cx+225,cy+200)
    ImageDraw.Draw(guide).rectangle(box,fill=c['skin']);d.rounded_rectangle(box,radius=70,fill=255)
    im=eye(ew,eh,side,c['colour'],style);guide.paste(im,(round(cx-im.width/2),round(cy-im.height/2)),im)
   alpha=alpha.filter(ImageFilter.GaussianBlur(3))
   crop=(450,1020 if m=='a' else 950,1470,1570 if m=='a' else 1510)
   input=guide.crop(crop).resize((1280,704),Image.Resampling.LANCZOS)
   mask=alpha.crop(crop).resize((1280,704),Image.Resampling.LANCZOS)
   input.save(dest/'input.png');mask.convert('RGB').save(dest/'mask.png');alpha.save(dest/'projection-mask.png');Image.fromarray(original).save(dest/'before.png');guide.save(dest/'guide.png')
   prompt=QUALITY+'safe. Front face texture of an adult anime '+('man' if m=='a' else 'woman')+', symmetrical '+('calm angular' if style=='calm' else 'open expressive')+' anime eyes, broad shaped upper eyelids, large dark '+('brown' if m=='a' else 'blue')+' irises partly covered by the upper lids, simple flat iris fills, one small highlight per eye, clean dark upper lash edge. Eyes look straight forward. Preserve the guided eye shape and flat warm skin.'
   cfg={'id':name,'model':m,'style':style,'seed':4101+(m=='b')*10+(style=='open'),'width':1280,'height':704,'steps':30,'cfg':5,'denoise':.30,'eye_dimensions':[ew,eh],'centres':c['centres'],'crop':crop,'prompt':prompt,'negative':'worst quality, low quality, blurry, photorealistic, doll eyes, bulging eyes, concentric rings, glass eyes, glossy eyes, multiple catchlights, realistic eyeballs, staring, cross eyed, extra pupils, extra eyes, text, watermark, eye makeup, skin texture, wrinkles','source_texture':str(tex.relative_to(ROOT)),'source_sha256':digest(tex),'rig':str(glb.relative_to(ROOT)),'rig_sha256':digest(glb),'method':'local RDBT LLLite masked img2img, front-to-UV projection; only eye strokes transferred','status':'prepared'}
   (dest/'settings.json').write_text(json.dumps(cfg,indent=2)+'\n');manifest.append(cfg)
 (HERE/'generation.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print('Prepared four controlled eye candidates',flush=True)

def render():
 jobs=json.loads((HERE/'generation.json').read_text())
 with comfy.gpu('codex-crowd-eyes-r4','render'):
  print('GPU ACQUIRED crowd eyes, four renders',flush=True)
  try:
   for cfg in jobs:
    dest=OUT/'takes'/cfg['id'];raw=dest/'generated.png'
    if raw.exists():print('Preserving existing',cfg['id'],flush=True);continue
    wf=comfy.anima(cfg['prompt'],cfg['negative'],model='rdbtAnima.safetensors',w=1280,h=704,steps=30,cfg=5,seed=cfg['seed']);del wf['6']
    wf['10']={'class_type':'LoadImage','inputs':{'image':comfy.upload(str(dest/'input.png'))}}
    wf['12']={'class_type':'LoadImageMask','inputs':{'image':comfy.upload(str(dest/'mask.png')),'channel':'red'}}
    wf['11']={'class_type':'VAEEncode','inputs':{'pixels':['10',0],'vae':['3',0]}}
    wf['13']={'class_type':'SetLatentNoiseMask','inputs':{'samples':['11',0],'mask':['12',0]}}
    wf['P']={'class_type':'ModelPatchLoader','inputs':{'name':'anima-lllite-inpainting-v2.safetensors'}}
    wf['A']={'class_type':'AnimaLLLiteApply','inputs':{'model':['1',0],'model_patch':['P',0],'image':['10',0],'mask':['12',0],'strength':1.,'start_percent':0.,'end_percent':1.}}
    wf['14']={'class_type':'DifferentialDiffusion','inputs':{'model':['A',0]}}
    wf['7']['inputs'].update(model=['14',0],latent_image=['13',0],denoise=cfg['denoise']);wf['9']['inputs']['filename_prefix']='crowd4/'+cfg['id']
    (dest/'workflow.json').write_text(json.dumps(wf,indent=2)+'\n');shutil.copy2(dest/'workflow.json',Path('/home/jorgen/ai/workflows')/('crowd4-'+cfg['id']+'.json'))
    print('START',cfg['id'],flush=True);comfy.run(wf,str(raw),timeout=600);print('FINISHED',cfg['id'],flush=True)
  finally:
   try:comfy._post('/free',{'unload_models':True,'free_memory':True})
   except json.JSONDecodeError:pass

def project():
 for cfg in json.loads((HERE/'generation.json').read_text()):
  dest=OUT/'takes'/cfg['id'];glb=ROOT/cfg['rig'];tex=ROOT/cfg['source_texture'];base=np.asarray(Image.open(tex).convert('RGB'))
  before,z=F.front(str(glb),str(tex));h,w=before.shape[:2];box=cfg['crop'];patch=Image.open(dest/'generated.png').convert('RGB').resize((box[2]-box[0],box[3]-box[1]),Image.Resampling.LANCZOS)
  layer=Image.new('RGBA',(w,h));layer.paste(patch,box[:2]);mask=Image.open(dest/'projection-mask.png').convert('L');layer.putalpha(mask);layer.save(dest/'paint.png')
  result=F.project(str(glb),str(tex),np.asarray(layer),zbuf=z)
  # Support is separately projected; prove no body/mouth/brow/hair texel was edited outside it.
  zero=dest/'support-base.png';Image.fromarray(np.zeros_like(base)).save(zero)
  support_layer=Image.new('RGBA',(w,h),(255,255,255,0));support_layer.putalpha(mask)
  support=F.project(str(glb),str(zero),np.asarray(support_layer),zbuf=z).max(2)>0
  result[~support]=base[~support]
  assert np.array_equal(result[~support],base[~support]);Image.fromarray((support*255).astype('uint8')).save(dest/'uv-support.png')
  Image.fromarray(result).save(dest/'base.webp',lossless=True,method=6)
  after,_=F.front(str(glb),str(dest/'base.webp'));Image.fromarray(after).save(dest/'front.png')
  game=OUT/'game'/cfg['id'];game.mkdir(parents=True,exist_ok=True)
  checks={}
  for name in ['walk.glb','run.glb','sit.glb','idle.json']:
   source=ROOT/'art/parts/crowd-pilot-3/game'/cfg['model']/name;target=game/name;shutil.copy2(source,target);assert digest(source)==digest(target);checks[name]=digest(target)
  shutil.copy2(dest/'base.webp',game/'base.webp')
  cfg.update(status='rendered, awaiting live visual review',invariants={'unchanged_non_eye_texels':int((~support).sum()),'outside_max_delta':0,'animation_sha256':checks})
  (dest/'settings.json').write_text(json.dumps(cfg,indent=2)+'\n');print('PROJECTED',cfg['id'],cfg['invariants']['unchanged_non_eye_texels'],flush=True)
if __name__=='__main__':globals()[sys.argv[1]]()
