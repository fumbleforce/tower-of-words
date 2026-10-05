"""carina-5 roots by the model (replaces the rejected script recolour in roots.py): RDBT Anima masked inpaint with the LLLite inpainting-v2 patch
(tools/workflows/lllite-inpaint-remove-rdbt.json) on the clean render. The mask is a band at the parting / hairline (geometry from roots.build_mask),
the prompt is the render's own prompt with the hair-colour phrase asking for dark roots, same seed. Usage: python inpaint.py <n> <src.webp> root|stripe <denoise> [tag]"""
import sys, os, json, numpy as np, cv2
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0, '/home/jorgen/repo/japanese/tools'); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comfy, roots, gen
HERE = os.path.dirname(os.path.abspath(__file__))
def go(n, src, kind, denoise, tag='i'):
    rgb = np.asarray(Image.open(src).convert('RGB')); alpha, face, fore = roots.build_mask(rgb, kind, 1)
    m = ndi.binary_dilation(alpha > 0.15, iterations=6)
    mk = (cv2.GaussianBlur(m.astype(np.float32), (0, 0), 3) * 255).clip(0, 255).astype(np.uint8)
    stem = os.path.basename(src)[:-5]; tmp = os.path.join(HERE, 'inp'); os.makedirs(tmp, exist_ok=True)
    Image.fromarray(rgb).save(f'{tmp}/{stem}-in.png'); Image.fromarray(mk).save(f'{tmp}/{stem}-mask.png')
    att = 'a2c' if 'a2c' in stem else 'a2b' if 'a2b' in stem else 'a2'
    d = [v for v in json.load(open(f'{HERE}/prompts-{att}.json')).values() if v['n'] == n][0]
    add = ('(dark roots at the scalp, dark brown hair roots along the parting and hairline, short band of dark brown root regrowth, blonde below the roots:1.5)' if kind == 'root'
           else '(dark roots at the scalp, thin dark brown stripes and lowlights in the golden blonde hair:1.5)')
    pr = d['prompt'].replace(gen.ROOT2, add).replace(gen.ROOT2.replace('thumb-width', 'slightly wider than a thumb-width'), add).replace(gen.STRIPE2, add)
    assert pr != d['prompt']
    neg = d['negative'].replace('(dark brown hair on top, brown hair, ombre,', '(ombre,')
    wf = json.load(open('/home/jorgen/repo/japanese/tools/workflows/lllite-inpaint-remove-rdbt.json'))
    wf['4']['inputs']['text'] = pr; wf['5']['inputs']['text'] = neg
    wf['10']['inputs']['image'] = comfy.upload(f'{tmp}/{stem}-in.png'); wf['12']['inputs']['image'] = comfy.upload(f'{tmp}/{stem}-mask.png')
    wf['7']['inputs']['seed'] = d['seed']; wf['7']['inputs']['denoise'] = denoise; wf['9']['inputs']['filename_prefix'] = 'carina5-inp'
    out = f'{HERE}/carina5-{n:02d}-{d["design"]}-{tag}.png'; comfy.run(wf, out)
    Image.open(out).save(out[:-4] + '.webp', quality=92)
    json.dump(dict(prompt=pr, negative=neg, seed=d['seed'], denoise=denoise, base=src), open(out[:-4] + '.json', 'w'), indent=1)
    return out
if __name__ == '__main__':
    print(go(int(sys.argv[1]), sys.argv[2], sys.argv[3], float(sys.argv[4]), sys.argv[5] if len(sys.argv) > 5 else 'i'))
