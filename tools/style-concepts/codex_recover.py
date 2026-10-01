"""Complete missing still views from an interrupted attempt's exact exported GLBs.

Existing renders are never overwritten. This also checks that the models load back into Blender.
The recovered views use the same studio staging as codex_build.py.
"""
import hashlib
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
import kit

out=Path(kit.args()[0])
if (out/'recovery.json').exists():
    raise RuntimeError('This recovery has already completed')
kit.reset()
chars={}
for ch in ('mio','eric'):
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(out/(ch+'.glb')))
    objs=list(set(bpy.data.objects)-before)
    coll=bpy.data.collections.new(ch+' recovered')
    bpy.context.scene.collection.children.link(coll)
    holder=bpy.data.objects.new(ch+' position',None)
    coll.objects.link(holder)
    for o in objs:
        if o.animation_data:
            o.animation_data.action=None
            for tr in o.animation_data.nla_tracks: tr.mute=True
        if o.parent is None: o.parent=holder
        for old in list(o.users_collection): old.objects.unlink(o)
        coll.objects.link(o)
    chars[ch]=(coll,holder,objs)
cam=kit.setup_render(res=(800,800),samples=24,sun_e=2.2,world_e=.8)
bpy.context.scene.render.threads_mode='FIXED'
bpy.context.scene.render.threads=8
written=[]
for ch,(coll,holder,objs) in chars.items():
    for name,(other,_,_) in chars.items(): other.hide_render=name!=ch
    lo,hi=kit.bounds(objs); mid=(lo+hi)/2; H=hi.z-lo.z
    for name,yaw,pitch in [('front',0,4),('three-quarter',40,6),('side',90,3),('back',180,4),('face',0,3),('face-3q',32,5)]:
        p=out/'renders'/f'{ch}-{name}.png'
        if p.exists(): continue
        target=(mid.x,mid.y,hi.z-H*.21) if name.startswith('face') else mid
        span=H*.49 if name.startswith('face') else H*1.15
        kit.aim(cam,target,yaw,pitch,span);kit.render(str(p));written.append(p.name)
for ch,(coll,holder,objs) in chars.items():
    coll.hide_render=False;holder.location.x=-.37 if ch=='mio' else .37
bpy.context.view_layer.update()
lo,hi=kit.bounds(chars['mio'][2]+chars['eric'][2]);mid=(lo+hi)/2
for name,yaw in [('pair',0),('pair-3q',28)]:
    p=out/'renders'/(name+'.png')
    if p.exists(): continue
    kit.aim(cam,mid,yaw,5,max(hi.z-lo.z,hi.x-lo.x)*1.16)
    kit.render(str(p));written.append(p.name)
(out/'recovery.json').write_text(json.dumps({'method':'Missing stills rendered from the exact existing GLBs after the original Blender process stopped. Original stills retained.',
    'sourceSHA256':{ch:hashlib.sha256((out/(ch+'.glb')).read_bytes()).hexdigest() for ch in chars},'added':written},indent=2)+'\n')
(out/'codex_recover.py').write_text(Path(__file__).read_text())
bpy.ops.wm.save_as_mainfile(filepath=str(out/'study-recovered.blend'))
