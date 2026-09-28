"""Strip the embedded textures from the Meshy GLBs (the game uses the cleaned texture base-clean.webp),
so each clip file is a few hundred KB instead of 4.5 MB. Mesh, skin and animation data are copied unchanged.
Usage: python3 game3d/tools/slim_glb.py"""
import json, struct, os
SRC = 'side/flat/meshy2/Meshy_AI_Neon_Bun_Guardian_biped/Meshy_AI_Neon_Bun_Guardian_biped_Animation_{}_withSkin.glb'
OUT = 'game3d/assets/mio/{}.glb'
CLIPS = {'Walking': 'walk', 'Running': 'run', 'Chair_Sit_Idle_F': 'sit', 'Step_to_Sit_Transition': 'tosit'}
for src, dst in CLIPS.items():
    b = open(SRC.format(src), 'rb').read()
    jl = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + jl])
    bin0 = 20 + jl + 8
    binb = b[bin0:bin0 + struct.unpack('<I', b[20 + jl:24 + jl])[0]]
    drop = {im['bufferView'] for im in j.get('images', [])}
    remap, out, views = {}, bytearray(), []
    for i, v in enumerate(j['bufferViews']):
        if i in drop: continue
        while len(out) % 4: out.append(0)
        data = binb[v.get('byteOffset', 0): v.get('byteOffset', 0) + v['byteLength']]
        nv = dict(v); nv['byteOffset'] = len(out); nv['buffer'] = 0
        remap[i] = len(views); views.append(nv); out += data
    while len(out) % 4: out.append(0)
    for a in j['accessors']:
        if 'bufferView' in a: a['bufferView'] = remap[a['bufferView']]
        if 'sparse' in a:
            a['sparse']['indices']['bufferView'] = remap[a['sparse']['indices']['bufferView']]
            a['sparse']['values']['bufferView'] = remap[a['sparse']['values']['bufferView']]
    j['bufferViews'] = views
    for k in ('images', 'textures', 'samplers'): j.pop(k, None)
    j['materials'] = [{'name': m.get('name', 'm'), 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': 1}} for m in j['materials']]
    j['buffers'] = [{'byteLength': len(out)}]
    js = json.dumps(j, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    total = 12 + 8 + len(js) + 8 + len(out)
    with open(OUT.format(dst), 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(out), 0x004E4942)); f.write(out)
    print(dst, os.path.getsize(OUT.format(dst)))
