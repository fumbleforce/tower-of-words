"""Make sheets for a Codex attempt. Uses the shared layout so all six concepts compare fairly."""
import argparse
from pathlib import Path
from PIL import Image
from sheets import flat, grid


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('directory',type=Path)
    ap.add_argument('--label',required=True)
    args=ap.parse_args()
    base=args.directory
    ims={}
    for file in sorted((base/'renders').glob('*.png')):
        name=file.stem
        ims[name]=Image.open(file).convert('RGB') if name.startswith('game-') else flat(file)
        ims[name].save(base/(name+'.webp'),quality=92)
    order=['front','three-quarter','side','back','face','face-3q','walk']
    sheets=[]
    for ch in ('mio','eric'):
        items=[(f'{ch} {v}',ims[f'{ch}-{v}']) for v in order if f'{ch}-{v}' in ims]
        if items:
            sheet=grid(items,4,(520,520),args.label+': '+ch)
            sheet.save(base/f'sheet-{ch}.webp',quality=90)
            sheets.append(sheet)
    pairs=[(n,ims[n]) for n in ('pair','pair-3q') if n in ims]
    if pairs:
        sheet=grid(pairs,2,(700,700),args.label+': together')
        sheet.save(base/'sheet-pair.webp',quality=90)
        sheets.append(sheet)
    game=[(n.removeprefix('game-'),im) for n,im in ims.items() if n.startswith('game-')]
    if game:
        sheet=grid(game,2,(1050,680),args.label+': game camera, Blender render of forecourt geometry')
        sheet.save(base/'sheet-game.webp',quality=90)
        sheets.append(sheet)
    full=Image.new('RGB',(max(s.width for s in sheets),sum(s.height for s in sheets)),(250,250,250))
    y=0
    for sheet in sheets:
        full.paste(sheet,(0,y)); y+=sheet.height
    full.save(base/'sheet.webp',quality=90)
    print(base/'sheet.webp',full.size)


if __name__=='__main__':
    main()
