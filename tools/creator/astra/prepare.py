"""Reproduce original eye extraction with the established reference capture; own output only."""
import os, sys
sys.path.insert(0, os.path.abspath('tools/creator/blender'))
import common as C
attempt=C.args()[0] if C.args() else 'attempt-01'
C.OUT = os.path.abspath('art/parts/astra/'+attempt)
import face as F
for body in C.args()[1:] or ['mio', 'eric']:
    path, frame = F.capture(body)
    F.key(body, path, frame)
    arm = next(o for o in __import__('bpy').data.objects if o.type == 'ARMATURE')
    print('JOINTS', body, {k: tuple(round(x / frame['span'] * .36, 5) for x in v) for k,v in C.joints(arm,body).items()})
