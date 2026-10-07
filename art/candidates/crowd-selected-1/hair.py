"""One local, masked fringe correction on the selected B; exact UV support conservation."""
from pathlib import Path
import sys,json,hashlib,shutil
import numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage
ROOT=Path(__file__).resolve().parents[3];MAIN=Path('/home/jorgen/repo/japanese')
sys.path[:0]=[str(ROOT/'art/candidates/crowd-pilot-4'),str(ROOT/'tools')]
import facepaint as F
import comfy
OUT=ROOT/'art/parts/crowd-selected-1/takes/b-hair-1'
RIG=MAIN/'art/parts/crowd-pilot-2/rig/b-rigged.glb'
TEX=MAIN/'art/parts/crowd-pilot-5/game/b-image/base.webp'
CROP=(760,420,1290,850)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def prepare():
 OUT.mkdir(parents=True,exist_ok=True)
 front,z=F.front(str(RIG),str(TEX));im=Image.fromarray(front)
 region=Image.new('L',im.size);ImageDraw.Draw(region).polygon([(884,635),(902,567),(1014,540),(1190,578),(1034,747)],fill=255)
 mask=ndimage.binary_dilation((np.array(region)>0)&(front[...,0]>155)&(front[...,1]>120),iterations=3)&(np.array(region)>0)
 alpha=Image.fromarray((mask*255).astype('uint8'));alpha.save(OUT/'projection-mask.png')
 guide=front.copy();colour=np.median(front[505:535,850:880].reshape(-1,3),axis=0).astype('uint8');guide[mask]=colour
 Image.fromarray(guide).save(OUT/'guide.png');im.save(OUT/'before.png')
 Image.fromarray(guide).crop(CROP).resize((768,640),Image.Resampling.LANCZOS).save(OUT/'input.png')
 alpha.crop(CROP).resize((768,640),Image.Resampling.LANCZOS).convert('RGB').save(OUT/'mask.png')
 cfg={'source':str(TEX.relative_to(MAIN)),'source_sha256':sha(TEX),'rig_sha256':sha(RIG),'crop':CROP,'mask_polygon':[(884,635),(902,567),(1014,540),(1190,578),(1034,747)],'seed':7381,'steps':24,'cfg':5,'denoise':.26,'model':'rdbtAnima.safetensors','method':'local LLLite inpainting-v2; constrained hair patch only','prompt':'masterpiece, best quality, score_9, score_8, score_7, year 2025, newest, highres, absurdres, very aesthetic, safe. Close detail of the existing dark brown hair fringe on a simple anime game model. Continuous dark brown hair across the small masked patch, matching the surrounding smooth flat hair texture and existing subtle strands. Preserve the exact fringe boundary and the open forehead.','negative':'worst quality, low quality, skin patch, bald spot, white hair, new hairstyle, curls, bright highlights, photorealistic, text, watermark','status':'prepared'}
 (OUT/'settings.json').write_text(json.dumps(cfg,indent=2)+'\n');print('Prepared mask pixels',int(mask.sum()),'hair guide',colour.tolist(),flush=True)
def render():
 cfg=json.loads((OUT/'settings.json').read_text())
 if (OUT/'generated.png').exists():raise SystemExit('Existing attempt preserved; no rerender')
 with comfy.gpu('codex-crowd-selected-hair','render'):
  try:
   wf=comfy.anima(cfg['prompt'],cfg['negative'],model=cfg['model'],w=768,h=640,steps=cfg['steps'],cfg=cfg['cfg'],seed=cfg['seed']);del wf['6']
   wf['10']={'class_type':'LoadImage','inputs':{'image':comfy.upload(str(OUT/'input.png'))}}
   wf['12']={'class_type':'LoadImageMask','inputs':{'image':comfy.upload(str(OUT/'mask.png')),'channel':'red'}}
   wf['11']={'class_type':'VAEEncode','inputs':{'pixels':['10',0],'vae':['3',0]}}
   wf['13']={'class_type':'SetLatentNoiseMask','inputs':{'samples':['11',0],'mask':['12',0]}}
   wf['P']={'class_type':'ModelPatchLoader','inputs':{'name':'anima-lllite-inpainting-v2.safetensors'}}
   wf['A']={'class_type':'AnimaLLLiteApply','inputs':{'model':['1',0],'model_patch':['P',0],'image':['10',0],'mask':['12',0],'strength':1.,'start_percent':0.,'end_percent':1.}}
   wf['14']={'class_type':'DifferentialDiffusion','inputs':{'model':['A',0]}}
   wf['7']['inputs'].update(model=['14',0],latent_image=['13',0],denoise=cfg['denoise']);wf['9']['inputs']['filename_prefix']='crowd-selected/b-hair-1'
   (OUT/'workflow.json').write_text(json.dumps(wf,indent=2)+'\n')
   for target in [ROOT/'tools/workflows/crowd-selected-b-hair-1.json',Path('/home/jorgen/ai/workflows/crowd-selected-b-hair-1.json')]:target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(OUT/'workflow.json',target)
   print('GPU RUNNING one selected B hair correction',flush=True);comfy.run(wf,str(OUT/'generated.png'),timeout=600)
  finally:
   try:comfy._post('/free',{'unload_models':True,'free_memory':True})
   except json.JSONDecodeError:pass
def project():
 cfg=json.loads((OUT/'settings.json').read_text());base=np.asarray(Image.open(TEX).convert('RGB'))
 before,z=F.front(str(RIG),str(TEX));h,w=before.shape[:2]
 patch=Image.open(OUT/'generated.png').convert('RGB').resize((CROP[2]-CROP[0],CROP[3]-CROP[1]),Image.Resampling.LANCZOS)
 layer=Image.new('RGBA',(w,h));layer.paste(patch,CROP[:2]);mask=Image.open(OUT/'projection-mask.png').convert('L')
 # Cover only the six-pixel fringe raster boundary left by front-to-UV sampling.
 # The original generated output remains visible in history; this is no new render.
 original_mask=np.asarray(mask)>0
 rim=ndimage.binary_dilation(original_mask,iterations=6)&(before[...,0]>140)&(before[...,1]>110)
 support_pixels=original_mask|rim
 pixels=np.asarray(layer).copy()
 bright=support_pixels&(pixels[...,0]>140)&(pixels[...,1]>110)
 dark=original_mask&(pixels[...,0]<100)&(pixels[...,1]<90)
 _,nearest=ndimage.distance_transform_edt(~dark,return_indices=True)
 pixels[bright,:3]=pixels[nearest[0][bright],nearest[1][bright],:3]
 pixels[...,3]=(support_pixels*255).astype('uint8');layer=Image.fromarray(pixels)
 mask=Image.fromarray(pixels[...,3]);mask.save(OUT/'projection-mask-final.png');layer.save(OUT/'paint.png')
 result=F.project(str(RIG),str(TEX),np.asarray(layer),zbuf=z)
 zero=OUT/'support-base.png';Image.fromarray(np.zeros_like(base)).save(zero)
 support_layer=Image.new('RGBA',(w,h),(255,255,255,0));support_layer.putalpha(mask)
 support=F.project(str(RIG),str(zero),np.asarray(support_layer),zbuf=z).max(2)>0
 result[~support]=base[~support]
 assert np.array_equal(result[~support],base[~support])
 Image.fromarray((support*255).astype('uint8')).save(OUT/'uv-support.png')
 Image.fromarray(result).save(OUT/'base.webp',lossless=True,method=6)
 checks={}
 for who in ['a','b']:
  dest=ROOT/'art/parts/crowd-selected-1/game'/who;dest.mkdir(parents=True,exist_ok=True)
  source=MAIN/f'art/parts/crowd-pilot-5/game/{who}-image'
  checks[who]={}
  for name in ['walk.glb','run.glb','sit.glb','idle.json','base.webp']:
   src=OUT/name if who=='b' and name=='base.webp' else source/name
   shutil.copy2(src,dest/name);assert sha(src)==sha(dest/name);checks[who][name]=sha(src)
 for name,yaw in [('front',0),('left',.6),('right',-.6)]:
  after,_=F.front(str(RIG),str(OUT/'base.webp'),yaw=yaw);Image.fromarray(after).save(OUT/(name+'.png'))
 cfg.update(status='rendered; pending actual 3D review',invariants={'outside_mask_max_delta':0,'unchanged_texels':int((~support).sum()),'changed_texels':int(np.any(base!=result,axis=2).sum()),'files':checks})
 (OUT/'settings.json').write_text(json.dumps(cfg,indent=2)+'\n');print(json.dumps(cfg['invariants']),flush=True)
if __name__=='__main__':globals()[sys.argv[1]]()
