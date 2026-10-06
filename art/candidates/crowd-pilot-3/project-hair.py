"""Transfer generated hair-seam corrections from a three-quarter view into the existing UV texture.
Keeps face skin, eyes, mouth, silhouette, mesh and rig; source images and masks remain alongside each take.
"""
from pathlib import Path
import json, shutil, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
import facepaint as F

m, source = sys.argv[1:]
p = Path('/home/jorgen/repo/japanese/art/parts')
out = p/'crowd-pilot-3'/'takes'/f'{m}-t9'
out.mkdir(exist_ok=True)
shutil.copy2(source,out/'source.png')
glb=str(p/'crowd-pilot-2'/'rig'/f'{m}-rigged.glb')
tex=str(p/'crowd-pilot-3'/'takes'/f'{m}-t7'/'base.webp')
front,z=F.front(glb,tex,yaw=-0.6)
h,w=front.shape[:2]
gen=np.array(Image.open(source).convert('RGB').resize((w,h),Image.Resampling.LANCZOS))
region=Image.new('L',(w,h));d=ImageDraw.Draw(region)
if m=='a':
    for box in [(485,800,610,1075),(1300,1020,1455,1190),(1540,1125,1610,1280),(1065,1250,1135,1465)]: d.rectangle(box,fill=255)
    mask=(np.array(region)>0)&(front[...,0]>55)&(front[...,0]<195)
else:
    d.polygon([(525,785),(682,548),(743,547),(744,595),(586,770)],fill=255)
    mask=(np.array(region)>0)&(front[...,0]>125)
mask=ndimage.binary_dilation(mask,iterations=1)&(np.array(region)>0)
# The edit's hair color comes from the generated correction, restricted to the stray seam pixels.
color=gen.copy()
hair_sample=np.median(gen[500:540,800:850].reshape(-1,3),axis=0)
color[color[...,0]>90]=hair_sample
layer=np.zeros((h,w,4),dtype=np.uint8);layer[...,:3]=color;layer[...,3]=mask.astype(np.uint8)*255
Image.fromarray(layer).save(out/'paint.png')
F.project(glb,tex,layer,out=str(out/'base.webp'),zbuf=z,yaw=-0.6,tol=0.0003,depth_filter=1)
for name,yaw in [('front',0),('turn',-.6),('opposite',.6)]:
    Image.fromarray(F.front(glb,str(out/'base.webp'),yaw=yaw)[0]).save(out/f'{name}.png')
(out/'settings.json').write_text(json.dumps({'source':'built-in imagegen','parent':f'{m}-t7','projection_yaw':-.6,'change':'hair seam only; no mesh, rig, eyes or mouth changes'},indent=2)+'\n')
shutil.copy2(out/'base.webp',p/'crowd-pilot-3'/'game'/m/'base.webp')
(p/'crowd-pilot-3'/'game'/m/'take.txt').write_text(f'{m}-t9\n')
