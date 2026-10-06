"""Finish A's generated hair correction in UV space, protecting original skin from projection overspray.
The opposite hair underside gets the same generated hair colour, with the same lower-head exclusion.
"""
from pathlib import Path
import json,shutil
import numpy as np
from PIL import Image, ImageDraw
import facepaint as F
p=Path('/home/jorgen/repo/japanese/art/parts')
out=p/'crowd-pilot-3'/'takes'/'a-t10';out.mkdir(exist_ok=True)
glb=str(p/'crowd-pilot-2'/'rig'/'a-rigged.glb')
base=p/'crowd-pilot-3'/'takes'/'a-t9'/'base.webp'
front,z=F.front(glb,str(base),yaw=.6)
h,w=front.shape[:2]
region=Image.new('L',(w,h));ImageDraw.Draw(region).rectangle((460,995,635,1200),fill=255)
mask=(np.asarray(region)>0)&(front[...,0]>55)&(front[...,0]<200)
gen=np.asarray(Image.open(p/'crowd-pilot-3'/'takes'/'a-t8'/'source.png').convert('RGB'))
color=np.median(gen[250:300,500:600].reshape(-1,3),axis=0)
layer=np.zeros((h,w,4),dtype=np.uint8);layer[...,:3]=color;layer[...,3]=mask.astype(np.uint8)*255
projected=F.project(glb,str(base),layer,zbuf=z,yaw=.6,tol=.0003,depth_filter=1)
original=np.asarray(Image.open(p/'crowd-pilot-3'/'takes'/'a-t7'/'base.webp').convert('RGB'))
# A's seam is grey, while the face is peach. Never paint over a skin-colour texel.
skin=(original[...,0]>200)&(original[...,1]>150)&(original[...,2]>120)
projected[skin]=original[skin]
Image.fromarray(projected).save(out/'base.webp',lossless=True)
for name,yaw in [('front',0),('turn',-.6),('opposite',.6)]: Image.fromarray(F.front(glb,str(out/'base.webp'),yaw=yaw)[0]).save(out/f'{name}.png')
(out/'settings.json').write_text(json.dumps({'source':'a-t8 built-in imagegen hair correction','parent':'a-t9','change':'UV skin protection and opposite hair underside'},indent=2)+'\n')
shutil.copy2(out/'base.webp',p/'crowd-pilot-3'/'game'/'a'/'base.webp')
(p/'crowd-pilot-3'/'game'/'a'/'take.txt').write_text('a-t10\n')
