"""Local background removal for character sprites.

Usage:
  python3 tools/rmbg_local.py --method isnet-anime  in1.png [in2.png ...] --out DIR
  python3 tools/rmbg_local.py --method rmbg2 art/slice/ch --out art/slice/cut-local

Methods (each re-executes itself in the venv it needs under ~/ai/rmbg/):
  isnet-anime         rembg, ISNet trained on anime characters (CPU, onnx)
  birefnet-general    rembg, BiRefNet general (CPU, onnx)
  birefnet-hr-matting ZhengPeng7/BiRefNet_HR-matting via transformers (soft alpha for hair)
  rmbg2               BRIA RMBG-2.0 (1038lab mirror) via transformers
  comfy-lucida        ComfyUI's built-in RemoveBackground node with the lucida model (needs ComfyUI on :8188)
Writes RGBA PNGs with the same file names into --out and prints seconds per image.
"""
import argparse, os, sys, time, json, glob

HOME = os.path.expanduser('~')
VENV = {'isnet-anime': 'rembg', 'birefnet-general': 'rembg', 'birefnet-hr-matting': 'hf', 'rmbg2': 'hf'}
HF_REPO = {'birefnet-hr-matting': ('ZhengPeng7/BiRefNet_HR-matting', 2048), 'rmbg2': ('1038lab/RMBG-2.0', 1024)}


def reexec(method):
    env = VENV.get(method)
    if not env:
        return
    py = os.path.join(HOME, 'ai', 'rmbg', env, 'bin', 'python')
    if os.path.realpath(sys.executable) != os.path.realpath(py) and os.environ.get('RMBG_REEXEC') != '1':
        os.environ['RMBG_REEXEC'] = '1'
        os.execv(py, [py] + sys.argv)


def inputs(paths):
    out = []
    for p in paths:
        out += sorted(glob.glob(os.path.join(p, '*.png'))) if os.path.isdir(p) else [p]
    return out


def run_rembg(method, files, out):
    from rembg import new_session, remove
    from PIL import Image
    sess = new_session(method)
    for f in files:
        t = time.time()
        img = remove(Image.open(f).convert('RGB'), session=sess)
        img.save(os.path.join(out, os.path.basename(f)))
        yield f, time.time() - t


def run_hf(method, files, out):
    import torch
    from PIL import Image
    from torchvision import transforms
    from transformers import AutoModelForImageSegmentation
    repo, size = HF_REPO[method]
    torch.set_num_threads(os.cpu_count())
    model = AutoModelForImageSegmentation.from_pretrained(repo, trust_remote_code=True).eval()
    tf = transforms.Compose([transforms.Resize((size, size)), transforms.ToTensor(),
                             transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])
    for f in files:
        t = time.time()
        img = Image.open(f).convert('RGB')
        with torch.no_grad():
            pred = model(tf(img).unsqueeze(0))[-1].sigmoid()[0, 0]
        mask = transforms.ToPILImage()(pred).resize(img.size)
        img.putalpha(mask)
        img.save(os.path.join(out, os.path.basename(f)))
        yield f, time.time() - t


def run_comfy(model_file, files, out):
    sys.path.insert(0, os.path.dirname(__file__))
    import comfy
    from PIL import Image
    for f in files:
        t = time.time()
        name = comfy.upload(f)
        wf = {
            '1': {'class_type': 'LoadBackgroundRemovalModel', 'inputs': {'bg_removal_name': model_file}},
            '2': {'class_type': 'LoadImage', 'inputs': {'image': name}},
            '3': {'class_type': 'RemoveBackground', 'inputs': {'bg_removal_model': ['1', 0], 'image': ['2', 0]}},
            '4': {'class_type': 'JoinImageWithAlpha', 'inputs': {'image': ['2', 0], 'alpha': ['5', 0]}},
            '5': {'class_type': 'InvertMask', 'inputs': {'mask': ['3', 0]}},
            '6': {'class_type': 'SaveImage', 'inputs': {'images': ['4', 0], 'filename_prefix': 'rmbg'}},
        }
        dst = os.path.join(out, os.path.basename(f))
        comfy.run(wf, dst)
        yield f, time.time() - t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--method', required=True, choices=['isnet-anime', 'birefnet-general', 'birefnet-hr-matting', 'rmbg2', 'comfy-lucida'])
    ap.add_argument('--out', required=True)
    ap.add_argument('--timings', help='merge per-image seconds as JSON into this file')
    ap.add_argument('--overwrite', action='store_true')
    ap.add_argument('paths', nargs='+')
    a = ap.parse_args()
    reexec(a.method)
    os.makedirs(a.out, exist_ok=True)
    files = [f for f in inputs(a.paths) if a.overwrite or not os.path.exists(os.path.join(a.out, os.path.basename(f)))]
    t0 = time.time()
    if a.method in ('isnet-anime', 'birefnet-general'):
        it = run_rembg(a.method, files, a.out)
    elif a.method == 'comfy-lucida':
        it = run_comfy('lucida.safetensors', files, a.out)
    else:
        it = run_hf(a.method, files, a.out)
    times = {}
    for f, s in it:
        times[os.path.basename(f)] = round(s, 2)
        print(f'ok {a.method} {os.path.basename(f)} {s:.2f}s', flush=True)
    print(f'{a.method}: {len(files)} images, total {time.time() - t0:.1f}s (incl. model load)')
    if a.timings:
        old = json.load(open(a.timings)) if os.path.exists(a.timings) else {}
        old.update(times)
        with open(a.timings, 'w') as fh:
            json.dump(old, fh)


if __name__ == '__main__':
    main()
