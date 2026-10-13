from PIL import Image, ImageDraw, ImageFont
import os
R='/home/jorgen/repo/japanese/'
H=os.path.dirname(os.path.abspath(__file__))+'/'
F=ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans.ttf',20) if os.path.exists('/usr/share/fonts/TTF/DejaVuSans.ttf') else ImageFont.load_default()
FB=ImageFont.truetype('/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',24) if os.path.exists('/usr/share/fonts/TTF/DejaVuSans-Bold.ttf') else F
# n, file, name, face/setting verdict, style verdict
FIN=[(1,'v3','at her desk on B2','PASS','PASS'),(2,'v2','monorail seat, laptop','PASS','PASS'),(3,'v2','head-office gate, arch','PASS','PASS'),
(4,'v2','dorm 203 desk, lamp','PASS','PASS'),(5,'v2','pool deck, swimsuit, towel','PASS','PASS'),(6,'v2','karaoke booth, microphone','PASS','PASS'),
(7,'v2','shotengai, lanterns, bag','PASS','PASS'),(8,'v3','with Mio, B2 corridor','DRIFT','PASS'),(9,'v2' if False else 'v3','with Emi, lift','DRIFT','PASS'),(10,'v2','dorm courtyard, hoodie, coffee','PASS','PASS')]
names={1:'b2-desk',2:'monorail',3:'gate',4:'dorm-203',5:'pool',6:'karaoke',7:'shotengai',8:'mio-corridor',9:'emi-lift',10:'courtyard'}
CW,CH=600,420  # cell image box
cols=2; PADT=44
def fit(im,w,h):
    im=im.convert('RGB'); s=min(w/im.width,h/im.height); return im.resize((int(im.width*s),int(im.height*s)))
anch=[('option 5 (carina-3)',R+'art/candidates/portraits/carina-3/carina3-05-glossy-bob-v4.webp'),('Mio anchor',R+'art/approved/mio/mio-after.webp'),('Kuro anchor',R+'art/approved/kuro/kuro-after.webp')]
W=cols*CW+ (cols+1)*10
top=Image.new('RGB',(W,360),'white'); d=ImageDraw.Draw(top); x=10
for lab,p in anch:
    im=fit(Image.open(p),(W-40)//3,310); top.paste(im,(x,40)); d.text((x,8),lab,fill='black',font=FB); x+=(W-40)//3+10
rows=(len(FIN)+1)//2
S=Image.new('RGB',(W,360+rows*(CH+PADT+10)),'white'); S.paste(top,(0,0)); d=ImageDraw.Draw(S)
for i,(n,v,lab,fv,sv) in enumerate(FIN):
    r,c=divmod(i,2); x=10+c*(CW+10); y=360+r*(CH+PADT+10)
    im=fit(Image.open(f'{H}cs-{n:02d}-{names[n]}-{v}.webp'),CW,CH)
    S.paste(im,(x,y+PADT))
    d.text((x,y+2),f'{n}. {lab}',fill='black',font=FB)
    d.text((x,y+24),f'FACE/PLACE {fv}   STYLE {sv}   ({v})',fill=(180,0,0) if fv!='PASS' else (0,110,0),font=F)
S.save(H+'sheet.png'); S.convert('RGB').save(H+'sheet.webp',quality=90); print(S.size)
