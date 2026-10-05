"""Numbered sheet: neutral row (as-is 1-3, closed mouth 4-6), surprised row (7-9), tired row (10-12); approved render at the end of row 2."""
from PIL import Image, ImageDraw, ImageFont
import os
H=os.path.dirname(os.path.abspath(__file__)); W,Hh=300,386; PAD=8; LAB=26
rows=[[f'cf1-neutral-asis-{i}' for i in (1,2,3)]+[f'cf1-neutral-closed-{i}' for i in (1,2,3)],
      [f'cf1-surprised-{i}' for i in (1,2,3)], [f'cf1-tired-{i}' for i in (1,2,3)]]
sheet=Image.new('RGB',(6*(W+PAD)+PAD,3*(Hh+LAB+PAD)+PAD),'white'); d=ImageDraw.Draw(sheet)
f=ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf',17) if os.path.exists('/usr/share/fonts/TTF/DejaVuSans.ttf') else None
n=0
for r,row in enumerate(rows):
    for c,name in enumerate(row):
        n+=1; im=Image.open(f'{H}/{name}.webp').convert('RGB').resize((W,Hh))
        x,y=PAD+c*(W+PAD),PAD+r*(Hh+LAB+PAD); sheet.paste(im,(x,y+LAB)); d.text((x,y+3),f'{n}  {name[4:]}',fill='black',font=f)
im=Image.open(f'{H}/../carina-9-jorgen/jorgen-r261005-203349-2fd-1.webp').convert('RGB').resize((W,Hh))
x,y=PAD+5*(W+PAD),PAD+1*(Hh+LAB+PAD); sheet.paste(im,(x,y+LAB)); d.text((x,y+3),'approved (his render)',fill='black',font=f)
sheet.save(H+'/sheet.png')
