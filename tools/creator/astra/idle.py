"""Put the approved THREE clip into its native GLB, for Blender review poses only.

Tracks map directly to the same glTF node TRS values; no retargeting or rig edits.
"""
import json,pathlib,struct,sys

def convert(body,out):
    src=pathlib.Path(f'game3d/assets/{body}/walk.glb').read_bytes();n=struct.unpack_from('<I',src,12)[0];g=json.loads(src[20:20+n]);off=20+n;blob=bytearray(src[off+8:off+8+struct.unpack_from('<I',src,off)[0]])
    clip=json.loads(pathlib.Path(f'game3d/assets/characters/relaxed-idle-{body}.json').read_text())
    names={node.get('name','').replace(':',''):i for i,node in enumerate(g['nodes'])}
    def acc(values,width):
        while len(blob)%4:blob.append(0)
        pos=len(blob);blob.extend(struct.pack('<'+'f'*len(values),*values));vi=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':pos,'byteLength':len(values)*4})
        a={'bufferView':vi,'componentType':5126,'count':len(values)//width,'type':{1:'SCALAR',3:'VEC3',4:'VEC4'}[width]}
        if width==1:a['min']=[min(values)];a['max']=[max(values)]
        g['accessors'].append(a);return len(g['accessors'])-1
    anim={'name':'approved-relaxed-3','samplers':[],'channels':[]}
    for t in clip['tracks']:
        name,prop=t['name'].rsplit('.',1);node=names[name];width=4 if prop=='quaternion' else 3
        si=len(anim['samplers']);anim['samplers'].append({'input':acc(t['times'],1),'output':acc(t['values'],width),'interpolation':'LINEAR'})
        anim['channels'].append({'sampler':si,'target':{'node':node,'path':{'position':'translation','quaternion':'rotation','scale':'scale'}[prop]}})
    g['animations']=[anim];g['buffers'][0]['byteLength']=len(blob)
    js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4);blob+=b'\0'*((-len(blob))%4)
    data=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(blob))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(blob),0x004e4942)+blob
    pathlib.Path(out).write_bytes(data);print(body,len(anim['channels']),'approved native idle tracks',out)
if __name__=='__main__':convert(sys.argv[1],sys.argv[2])
