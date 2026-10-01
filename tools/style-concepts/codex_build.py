"""Build and render one Codex concept. Run Blender -b -t 8 -P this.py -- stitch attempt-01 [views].

Staging: neutral standing study on a shadow floor. Front at -Y, side from her left (+X, image right
in front view), rear +Y. Lens centre near mid-body; face shots at eye height. Mio on image left and
Eric right in the pair, separated by 0.74 m. Eyes look straight ahead; no implied dialogue or motion
except the labelled walk sample. Soft daylight from front-left. Heads and shoes stay in full views.
"""
import importlib
import json
import os
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import bpy
import kit

style,attempt,*rest=kit.args()
views=rest[0].split(',') if rest else ['front','three-quarter','side','back','face','face-3q','walk','pair']
out=Path(kit.OUT)/('codex-'+style)/attempt
if out.exists() and any(out.iterdir()):
    raise RuntimeError('Keep every attempt: use a new attempt number instead of replacing renders')
out.mkdir(parents=True,exist_ok=True)
for name in ('codex_forms.py','codex_'+style+'.py','codex_build.py','kit.py'):
    (out/name).write_text((Path(__file__).parent/name).read_text())
mod=importlib.import_module('codex_'+style)
kit.reset()
chars={}
for ch in ('mio','eric'):
    coll=bpy.data.collections.new(ch); bpy.context.scene.collection.children.link(coll)
    arm,objs=mod.build(ch,coll)
    kit.motions(arm,kit.bounds(objs)[1].z,**mod.MOTION)
    # Export with both NLA tracks enabled; pose_at(None) mutes them for stills only.
    for tr in arm.animation_data.nla_tracks: tr.mute=False
    kit.export(coll,str(out/(ch+'.glb')))
    kit.pose_at(arm,None,1)
    chars[ch]=(coll,arm,objs)
cam=kit.setup_render(res=(800,800),samples=24,sun_e=2.2,world_e=.8)
bpy.context.scene.render.threads_mode='FIXED'
bpy.context.scene.render.threads=8
manifest={'style':style,'attempt':attempt,'renderer':'Cycles CPU','samples':24,'resolution':[800,800],
          'source':['codex_'+style+'.py','codex_forms.py'],'characters':{},'views':views}
for ch,(coll,arm,objs) in chars.items():
    for name,(other,_,_) in chars.items(): other.hide_render=name!=ch
    lo,hi=kit.bounds(objs); H=hi.z-lo.z; mid=(hi+lo)/2
    manifest['characters'][ch]={'height':H,'meshes':len(objs),'polygons':sum(len(o.data.polygons) for o in objs)}
    shots={'front':(mid,0,4,H*1.15),'three-quarter':(mid,40,6,H*1.15),'side':(mid,90,3,H*1.15),
           'back':(mid,180,4,H*1.15),'face':(mod.HEAD[ch],0,3,H*mod.HEAD_SPAN),
           'face-3q':(mod.HEAD[ch],32,5,H*mod.HEAD_SPAN)}
    for v,(target,yaw,pitch,span) in shots.items():
        if v in views:
            kit.aim(cam,target,yaw,pitch,span); kit.render(str(out/'renders'/(ch+'-'+v+'.png')))
    if 'walk' in views:
        # Each armature owns distinct action datablocks even when Blender suffixes their names.
        action=next(t.strips[0].action for t in arm.animation_data.nla_tracks if t.name=='walk')
        kit.pose_at(arm,action.name,7)
        kit.aim(cam,mid,40,6,H*1.15); kit.render(str(out/'renders'/(ch+'-walk.png')))
        kit.pose_at(arm,None,1)
if 'pair' in views:
    for ch,(coll,arm,objs) in chars.items():
        coll.hide_render=False; arm.location.x=-.37 if ch=='mio' else .37
    bpy.context.view_layer.update()
    lo,hi=kit.bounds(chars['mio'][2]+chars['eric'][2]); mid=(lo+hi)/2
    for name,yaw in [('pair',0),('pair-3q',28)]:
        kit.aim(cam,mid,yaw,5,max(hi.z-lo.z, hi.x-lo.x)*1.16)
        kit.render(str(out/'renders'/(name+'.png')))
# Save a reproducible scene including the rig. The source is copied per attempt to retain its exact build.
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'study.blend'))
