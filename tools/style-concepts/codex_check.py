"""Validate delivered concepts and the glTF buffers used by the live viewer (standard Python)."""
import argparse
import json
import math
import struct
from pathlib import Path


def glb(path):
    raw=path.read_bytes()
    assert struct.unpack_from('<4sII',raw)==(b'glTF',2,len(raw)), f'{path}: invalid GLB header'
    size,kind=struct.unpack_from('<II',raw,12)
    assert kind==0x4e4f534a
    doc=json.loads(raw[20:20+size])
    binary_len,binary_type=struct.unpack_from('<II',raw,20+size)
    assert binary_type==0x004e4942 and 28+size+binary_len==len(raw)
    binary=raw[28+size:]
    assert not doc.get('images'),f'{path}: expected plain materials'
    assert {a['name'] for a in doc['animations']}=={'idle','walk'}
    for action in doc['animations']:
        assert action['channels'] and action['samplers'],f'{path}: empty animation'
    for view in doc['bufferViews']:
        assert view.get('byteOffset',0)+view['byteLength']<=len(binary)
    for accessor in doc['accessors']:
        if accessor['componentType']!=5126 or 'bufferView' not in accessor:
            continue
        view=doc['bufferViews'][accessor['bufferView']]
        offset=view.get('byteOffset',0)+accessor.get('byteOffset',0)
        components={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[accessor['type']]
        stride=view.get('byteStride',components*4)
        for i in range(accessor['count']):
            assert all(math.isfinite(x) for x in struct.unpack_from('<'+'f'*components,binary,offset+i*stride))
    assert all('uri' not in b for b in doc['buffers']),f'{path}: external buffer'
    return {'meshes':len(doc['meshes']),'nodes':len(doc['nodes']),'animations':[a['name'] for a in doc['animations']]}


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('root',type=Path)
    ap.add_argument('--models-only',action='store_true')
    args=ap.parse_args()
    concepts=json.loads((Path(__file__).parent/'concepts.json').read_text())
    report={}
    for concept in concepts:
        if not concept['id'].startswith('codex-'):continue
        base=args.root/concept['dir'].lstrip('/')
        info={ch:glb(base/(ch+'.glb')) for ch in ('mio','eric')}
        if not args.models_only:
            for file in ('sheet.webp','pair.webp','study.blend','manifest.json','forecourt-manifest.json'):
                assert (base/file).is_file(),str(base/file)
            for ch in ('mio','eric'):
                for view in ('front','three-quarter','side','back','face','face-3q','walk'):
                    assert (base/'renders'/f'{ch}-{view}.png').is_file()
            for view in ('desk','phone'):
                assert (base/'renders'/f'game-forecourt-{view}.png').is_file()
            for attempt,_ in concept['attempts']:
                folder=base.parent/attempt
                for file in ('sheet.webp','pair.webp','mio.glb','eric.glb'):
                    assert (folder/file).is_file(),str(folder/file)
        report[concept['id']]=info
    assert len(report)==3
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
