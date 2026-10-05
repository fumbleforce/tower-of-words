"""Numbered sheet: neutral row (1-3), surprised (4-6), tired (7-9); his approved render at the end of row 1."""
from PIL import Image, ImageDraw, ImageFont
import os
H=os.path.dirname(os.path.abspath(__file__)); W,Hh=400,514; PAD=8; LAB=26
rows=[[f'cf2-{k}-{i}' for i in (1,2,3)] for k in ('neutral-asis','surprised','tired')]
sheet=Image.new('RGB',(4*(W+PAD)+PAD,3*(Hh+LAB+PAD)+PAD),'white'); d=ImageDraw.Draw(sheet)
f=ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf',17)
n=0
for r,row in enumerate(rows):
    for c,name in enumerate(row):
        n+=1; im=Image.open(f'{H}/{name}.webp').convert('RGB').resize((W,Hh))
        x,y=PAD+c*(W+PAD),PAD+r*(Hh+LAB+PAD); sheet.paste(im,(x,y+LAB)); d.text((x,y+3),f'{n}  {name[4:]}',fill='black',font=f)
im=Image.open(f'{H}/../carina-9-jorgen/jorgen-r261005-203349-2fd-1.webp').convert('RGB').resize((W,Hh))
sheet.paste(im,(PAD+3*(W+PAD),PAD+LAB)); d.text((PAD+3*(W+PAD),PAD+3),'approved (his render, old sweater)',fill='black',font=f)
sheet.save(H+'/sheet.png')
