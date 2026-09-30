"""Same studio lights, yaw/pitch and crop definitions as creator-blender-1.

Staging: review evidence of a stationary rig on the origin's floor plane. Front at yaw 0,
three-quarter 40, side 90, back 180; close-ups at the shared views.py cameras. Character
looks forward. Soft studio sky fill plus upper-left sun. No off-camera set or story props.
Body/clothes visibility is the only change between bare/dressed; head stays fixed.
"""
import os,sys
import bpy
sys.path.insert(0,os.path.abspath('tools/creator/blender'))
import common as C
import views
args=C.args();body,attempt,tag=args[:3];mode=args[3] if len(args)>3 else 'dressed';only=args[4].split(',') if len(args)>4 else ['front','three-quarter']
p=os.path.abspath('art/parts/astra/'+attempt);C.reset();bpy.ops.import_scene.gltf(filepath=p+'/'+body+'.glb')
arm=next(o for o in bpy.data.objects if o.type=='ARMATURE');objs=[]
for o in bpy.data.objects:
    if o.type!='MESH':continue
    on=True
    if mode=='bare':on=o.name.endswith('-body') or '-hair' in o.name
    if mode=='nohair':on=o.name.endswith('-body')
    if mode=='hoodinside':on='-hair' not in o.name
    o.hide_render=not on
    if on:objs.append(o)
if len(args)>5 and args[5]!='rest':
    if args[5].startswith('idle'):
        before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=p+'/'+body+'-idle-source.glb')
        imported=next(o for o in set(bpy.data.objects)-before if o.type=='ARMATURE');action=imported.animation_data.action
        for o in set(bpy.data.objects)-before:bpy.data.objects.remove(o,do_unlink=True)
        arm.animation_data_create();arm.animation_data.action=action
        if action.slots:arm.animation_data.action_slot=action.slots[0]
        frame=float(args[5][4:] or '1')*bpy.context.scene.render.fps
        bpy.context.scene.frame_set(int(frame),subframe=frame%1)
    else:
        before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=os.path.join(C.ROOT,C.ORIGINAL[body]))
        for o in set(bpy.data.objects)-before:bpy.data.objects.remove(o,do_unlink=True)
        frame=float(args[5][4:])*bpy.context.scene.render.fps if args[5].startswith('time') else float(args[5])
        views.pose(arm,int(frame))
        bpy.context.scene.frame_set(int(frame),subframe=frame%1)
        print('POSE_TIME',body,'seconds',frame/bpy.context.scene.render.fps,'frame',frame)
views.shoot(body,arm,objs,p+'/renders',body+'-'+tag,'CYCLES',only)
