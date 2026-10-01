"""Write the facet review from all saved attempts, including interrupted Claude work.
Run after rendering mf-06 and mf-07 with mio_facets_build.py. Sources remain in the worktree; binary
outputs are served from the main checkout through mio_i2i_cam.MAIN.
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import mio_i2i_cam as C
from mio_facets_wire import OUT

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = Path(OUT)
FONT = ImageFont.load_default(size=20)


def tile(path, label, size=520):
    im = Image.open(path).convert('RGBA')
    bg = Image.new('RGBA', im.size, (224,227,230,255))
    bg.alpha_composite(im)
    bg = bg.convert('RGB').resize((size,size), Image.Resampling.LANCZOS)
    ImageDraw.Draw(bg).rectangle((0,0,size,32),fill='white')
    ImageDraw.Draw(bg).text((8,5),label,font=FONT,fill='black')
    return bg


def sheet(tiles, columns, path):
    size = tiles[0].width
    out = Image.new('RGB',(columns*size,((len(tiles)+columns-1)//columns)*size),'white')
    for i,im in enumerate(tiles):
        out.paste(im,((i%columns)*size,(i//columns)*size))
    out.save(path,quality=92)


def main():
    for attempt in ('mf-06', 'mf-07'):
        head = OUT/attempt
        tags = ['front','l40','l90','back','r40','r90']
        sheet([tile(head/'renders'/f'{t}.png',t) for t in tags],3,head/'turn.webp')
        sheet([tile(head/'renders'/f'clay-{t}.png','clay '+t) for t in ['front','l40','l90','back']],2,head/'clay.webp')
        # Matched framing uses the preserved full-body camera crop for the reference,
        # with the head rendered in its own closer camera; labels disclose the framing.
        ref = Image.open(C.CLEAN).convert('RGB')
        k=ref.width/1024
        ref=ref.crop(tuple(int(x*k) for x in (395,45,625,300)))
        ref.save(OUT/'reference-head.png')
        ref.thumbnail((520,488))
        panel=Image.new('RGB',(520,520),(224,227,230)); panel.paste(ref,((520-ref.width)//2,32))
        ImageDraw.Draw(panel).text((8,5),'reference head crop',font=FONT,fill='black')
        sheet([panel,tile(head/'renders/front.png',attempt+': close camera'),tile(head/'renders/l40.png',attempt+': her left (image right), 40°')],3,head/'compare.webp')
    configs=json.loads((HERE/'mio-facets.json').read_text())
    observations={
      'mf-01':'The round core and back shell cut through the face and clothes. Earlier saved attempt; retained for comparison.',
      'mf-02':'Clamping the back reduces protrusions; dark core patches still cross the face and clothes.',
      'mf-03':'Flattening the core removes most patches; the side views reveal large open seams.',
      'mf-04':'The front uses the hand trace. The pocket and shoes lose detail, and the side seams remain open.',
      'mf-05':'Warping the back reduces the seams, but visible gaps remain at the head, shoulders and ankles. This is the last saved Claude attempt.',
      'mf-06':'Automatic feature tracing left jagged brows and lost the mouth. Head-only continuation. The shell has 228 triangles and no boundary or non-manifold edges; 442 more triangles draw the facial marks. The rear repeats the front topology with inferred dark hair colours. No rig or expressions yet. The rest of the body is excluded.',
      'mf-07':'Facial-only correction to mf-06, with 101 feature triangles. The mouth is a thin line; eyes and brows use explicit polygons. The shell is unchanged. The eyes are narrower than the target, with pale breaks across the irises. The side hair is thick and angular; a pale facet remains at her left hair tip (image right). The back is broad and plain. Expressions and rigging remain unbuilt.'}
    options=[]
    links=[dict(label='Rotate all seven attempts',href='tools/style-concepts/mio-facets-viewer.html?c=mf-07'),dict(label='Previous decision and rejected models',href='bible/#review/char-mio-i2i-1')]
    prefix='art/parts/style-concepts/claude-miofacets/'
    for att,cfg in configs.items():
        imgs=['turn.webp','clay.webp'] if cfg.get('slice')=='head' else ['turn.webp','face.webp','wire.webp','parts.webp']
        options.append(dict(id=att,label=cfg['label'],image=prefix+att+'/compare.webp',images=[prefix+att+'/'+f for f in imgs],note=cfg['note'].rstrip('.')+'. '+observations[att]+(' Earlier full-body attempts use a projected facial decal; mf-06 and mf-07 replace it with geometry.' if cfg.get('slice')!='head' else '')+' Render settings: 1024 px, 20° lens, 4° pitch, unlit facet colours; clay uses 32 CPU Cycles samples and marked facet edges. No generative prompt was used for this continuation.'))
        links.append(dict(label=att+' · every saved render',href=prefix+att+'/renders/'))
    item=dict(title='Mio: traced facets and a closed head study',date='2026-10-01',by='Claude; continued by Codex',status='open',question='Does mf-07 put the head’s facets and face in the right direction?',multi=True,options=options,links=links,issue=171)
    dest=ROOT/'reviews/char-mio-facets-1';dest.mkdir(parents=True,exist_ok=True)
    (dest/'review.json').write_text(json.dumps(item,indent=2,ensure_ascii=False)+'\n')
    print(dest/'review.json')


if __name__ == '__main__':
    main()
