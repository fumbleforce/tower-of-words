# char-mio-i2i, the one Meshy comparison (labelled as such on the review; never a base to patch, GUIDE: model in
# Blender). Image-to-3D with texture from the clean reference's cut-out, cropped to the figure, one call.
#   python3 tools/style-concepts/mio_i2i_meshy.py
# Writes claude-mioi2i/meshy-01/: input.png, task.json, mio.glb (as Meshy returns it), preview.png.
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'characters'))
import meshy  # noqa: E402

MAIN = os.path.dirname(subprocess.check_output(['git', '-C', HERE, 'rev-parse', '--path-format=absolute',
                                                '--git-common-dir'], text=True).strip())
OUT = os.path.join(MAIN, 'art/parts/style-concepts/claude-mioi2i/meshy-01')


def main():
    from PIL import Image
    os.makedirs(OUT, exist_ok=True)
    im = Image.open(os.path.join(MAIN, 'art/parts/style-concepts/mio-ref-clean/final-cutout.png')).convert('RGBA')
    box = im.getchannel('A').getbbox()
    pad = 60
    im = im.crop((box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad))
    im.thumbnail((1024, 1024))
    src = os.path.join(OUT, 'input.png')
    im.save(src)
    body = {'image_url': meshy.data_uri(src), 'ai_model': 'meshy-t2', 'model_type': 'smart-topology',
            'target_polycount': 3000, 'should_texture': True, 'enable_pbr': False, 'target_formats': ['glb']}
    tid = meshy.call('POST', '/v1/image-to-3d', body)['result']
    print('task', tid, flush=True)
    r = meshy.wait('image-to-3d', tid)
    json.dump(r, open(os.path.join(OUT, 'task.json'), 'w'), indent=1)
    if r.get('status') != 'SUCCEEDED':
        sys.exit('meshy failed: ' + str(r.get('task_error')))
    meshy.fetch(r['model_urls']['glb'], os.path.join(OUT, 'mio.glb'))
    if r.get('thumbnail_url'):
        meshy.fetch(r['thumbnail_url'], os.path.join(OUT, 'preview.png'))


if __name__ == '__main__':
    main()
