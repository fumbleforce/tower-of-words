"""Solid shaped parts for Codex's three independent character studies. Z up, face -Y."""
import math
import bpy
from mathutils import Vector
import kit

PAL = {
    'mio': dict(skin='#efd5bd', hair='#13292f', accent='#20a081', coat='#104048',
                inner='#22545a', trouser='#424555', shoe='#e4e9e5', frame='#909b97', eye='#c9ad73'),
    'eric': dict(skin='#e9c8ad', hair='#9e8e6d', accent='#3d6598', coat='#283f59',
                 inner='#9c9da2', trouser='#3c4352', shoe='#333c48', frame='#a8bbc5', eye='#528aa9'),
}


class Model:
    def __init__(self, ch, coll, style):
        self.ch, self.coll, self.style = ch, coll, style
        self.c = PAL[ch]
        self.parts = {n: [] for n in ('root', 'torso', 'head', 'arm.L', 'arm.R', 'leg.L', 'leg.R')}
        self.bone = 'torso'

    def add(self, obj):
        self.parts[self.bone].append(obj)
        return obj

    def mat(self, c):
        return kit.mat(self.c.get(c, c), rough=0.96 if self.style == 'stitch' else 0.72)

    def ball(self, name, c, loc, size, rot=(0, 0, 0)):
        return self.add(kit.prim('sphere', name, '', loc, size, rot, segs=24, m=self.mat(c),
                                 smooth=60, coll=self.coll))

    def box(self, name, c, loc, size, bevel=0.15, rot=(0, 0, 0)):
        return self.add(kit.prim('box', name, '', loc, size, rot, bevel=bevel, bevel_segs=4,
                                 m=self.mat(c), smooth=60, coll=self.coll))

    def line(self, name, c, points, radius=0.006, cyclic=False, tip=1):
        curve = bpy.data.curves.new(name, 'CURVE')
        curve.dimensions = '3D'
        curve.resolution_u = 1
        curve.bevel_depth, curve.bevel_resolution = radius, 2
        curve.use_fill_caps = True
        poly = curve.splines.new('POLY')
        poly.points.add(len(points)-1)
        for p, v in zip(poly.points, points):
            p.co = (*v, 1)
        poly.use_cyclic_u = cyclic
        poly.points[-1].radius = tip
        o = kit.link(bpy.data.objects.new(name, curve), self.coll)
        o.data.materials.append(self.mat(c))
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        bpy.ops.object.convert(target='MESH')
        o.select_set(False)
        return self.add(o)

    def rings(self, name, c, rows, segs=16, smooth=60):
        # rows: (z, half-width, half-depth, y-centre). Elliptic sections create actual volume.
        if self.bone == 'torso':
            self.torso_profile = rows
        vs = [(rx*math.cos(a*2*math.pi/segs), cy+ry*math.sin(a*2*math.pi/segs), z)
              for z, rx, ry, cy in rows for a in range(segs)]
        fs = [tuple(reversed(range(segs))), tuple(range((len(rows)-1)*segs, len(rows)*segs))]
        for j in range(len(rows)-1):
            for a in range(segs):
                b=(a+1)%segs
                fs.append((j*segs+a, j*segs+b, (j+1)*segs+b, (j+1)*segs+a))
        obj=self.add(kit.mesh(name, vs, fs, '', m=self.mat(c), smooth=smooth, coll=self.coll))
        if self.bone == 'torso':
            self.torso_object = obj
        return obj

    def prism(self, name, c, outline, y, depth, bevel=0):
        # A shaped face on XZ with solid thickness in Y.
        vs=[(x, y+d, z) for d in (-depth/2, depth/2) for x,z in outline]
        n=len(outline)
        fs=[tuple(reversed(range(n))),tuple(range(n,n*2))]
        fs += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        o=self.add(kit.mesh(name,vs,fs,'',m=self.mat(c),coll=self.coll))
        if bevel:
            mod=o.modifiers.new('soft carved edges','BEVEL'); mod.width=bevel; mod.segments=2
            bpy.context.view_layer.objects.active=o
            bpy.ops.object.modifier_apply(modifier=mod.name)
        return o

    def glasses(self, z, y, wide=0.25, tall=0.085, rounded=True):
        for s in (-1,1):
            cx=s*wide*0.26; rx=wide*0.235; rz=tall/2
            pts=[]
            # Superellipse gives lenses a broad rectangular front, with soft corners.
            power=0.5 if rounded else 0.25
            for i in range(40):
                a=2*math.pi*i/40
                x=rx*math.copysign(abs(math.cos(a))**power,math.cos(a))
                zz=rz*math.copysign(abs(math.sin(a))**power,math.sin(a))
                pts.append((cx+x,y+abs(cx+x)*0.08,z+zz))
            self.line('silver spectacle rim','frame',pts,0.007,True)
            self.line('temple','frame',[(cx+s*rx,y+0.01,z+0.025),(s*wide*0.6,0.04,z+0.018)],0.005)
        self.line('bridge','frame',[(-wide*.05,y,z+.014),(0,y-.009,z+.019),(wide*.05,y,z+.014)],.006)

    def surface(self, x, z, gap=0.004):
        hit, point, normal, _ = self.torso_object.ray_cast(Vector((x,-10,z)), Vector((0,1,0)))
        if hit:
            return tuple(point+normal*gap)
        rows = self.torso_profile
        a, b = rows[0], rows[-1]
        for lo, hi in zip(rows, rows[1:]):
            if lo[0] <= z <= hi[0]:
                a, b = lo, hi
                break
        t = min(1, max(0, (z-a[0]) / (b[0]-a[0])))
        rx, ry, cy = [a[i]*(1-t)+b[i]*t for i in (1, 2, 3)]
        return (x, cy-ry*math.sqrt(max(0, 1-(x/rx)**2))-gap, z)

    def garment_panel(self, name, c, rows, gap=0.009):
        # Thin solid applique follows the actual torso surface instead of hovering in front.
        dense = []
        for (za,wa),(zb,wb) in zip(rows,rows[1:]):
            steps=math.ceil((zb-za)/.018)
            dense += [(za+(zb-za)*i/steps,wa+(wb-wa)*i/steps) for i in range(steps)]
        rows=dense+[rows[-1]]
        front = [self.surface(w*(i/3-1), z, gap) for z,w in rows for i in range(7)]
        count = len(front)
        vs = front+[(x,y+.008,z) for x,y,z in front]
        fs = []
        for j in range(len(rows)-1):
            for i in range(6):
                a=j*7+i; b=a+1; c1=a+8; d=a+7
                fs.extend([(a,b,c1,d),(a+count,d+count,c1+count,b+count)])
        edge=list(range(7))+[j*7+6 for j in range(1,len(rows))]
        edge+=list(range(count-2,count-8,-1))+[j*7 for j in range(len(rows)-2,0,-1)]
        for i,a in enumerate(edge):
            b=edge[(i+1)%len(edge)]; fs.append((a,a+count,b+count,b))
        return self.add(kit.mesh(name,vs,fs,'',m=self.mat(c),smooth=60,coll=self.coll))

    def detail(self, neck, depth, halfwidth):
        self.bone='torso'
        if self.ch=='mio':
            self.ball('hood folded behind neck','inner',(0,.07,neck-.025),(.30,.25,.14))
            self.line('headphone band','#172c34',[(-.12,-depth,neck-.04),(-.1,-depth-.035,neck-.09),
                      (0,-depth-.04,neck-.13),(.1,-depth-.035,neck-.09),(.12,-depth,neck-.04)],.012)
            for s in (-1,1):
                self.ball('ear cup','hair',(s*.12,-depth-.015,neck-.085),(.105,.055,.12))
                self.ball('teal cup inset','accent',(s*.12,-depth-.042,neck-.085),(.075,.018,.08))
            self.line('lanyard','accent',[(-.05,-depth-.016,neck-.12),(0,-depth-.034,neck-.28),(.07,-depth-.016,neck-.12)],.009)
            self.box('badge','#e8ece5',(0,-depth-.047,neck-.29),(.065,.015,.086),.04)
            self.box('badge stripe','accent',(0,-depth-.056,neck-.274),(.047,.006,.012),.02)
        else:
            self.ball('hood grey fold','inner',(0,.045,neck-.025),(.32,.27,.14))
            self.garment_panel('hoodie front','inner',[(neck-.38,.058),(neck-.28,.068),(neck-.17,.078),(neck-.075,.074)])
            for s in (-1,1):
                points = [(s*.13,neck-.085),(s*.086,neck-.19),(s*.059,neck-.36)]
                self.line('lapel piping','coat',[self.surface(x,z,.014) for x,z in points],.012)
                self.line('drawstring','#e2e3dc',[self.surface(s*.032,neck-.10,.016),
                          self.surface(s*.039,neck-.21,.016)],.004)


    def rig(self, hip, neck, shoulder, armend, legx):
        bones=[('root',(0,0,0),(0,0,hip),None),('torso',(0,0,hip),(0,0,neck),'root'),
               ('head',(0,0,neck),(0,0,neck+.4),'torso')]
        for s,suffix in ((1,'L'),(-1,'R')):
            bones += [('arm.'+suffix,(s*shoulder,0,neck-.055),(s*armend,0,hip+.045),'torso'),
                      ('leg.'+suffix,(s*legx,0,hip),(s*legx,0,.06),'root')]
        arm=kit.rig(self.ch+'-'+self.style,bones,self.coll)
        objs=[]
        for bone, parts in self.parts.items():
            for o in parts:
                kit.attach(o,arm,bone); objs.append(o)
        return arm,objs
