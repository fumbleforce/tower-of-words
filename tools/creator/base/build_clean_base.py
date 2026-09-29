#!/usr/bin/env python3
"""Author a small, connected chibi mannequin in the existing creator bind space.

Run with a Python that has numpy and Pillow:
  /home/jorgen/ai/flat-venv/bin/python tools/creator/base/build_clean_base.py eric v1

All surface positions come from explicit rings. No remeshing, decimation, cloth
shrink-wrapping, or per-vertex pushing. The only source-derived surface detail is
a front projection of the existing eyes/brows. Normals and weights are welded.
"""
import json, math, sys, hashlib
from pathlib import Path
from collections import defaultdict, deque
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'art/parts/base'

def check_crossings(path):
    """Count proper edge/triangle crossings; coplanar overlaps are not covered.

    This complements the topology validator. A manifold surface can still fold
    through itself. Segment endpoints and triangle boundaries are excluded so
    shared mesh edges do not report as intersections.
    """
    d=json.loads(Path(path).read_text())
    triangles=np.array(d['pos']).reshape(-1,3,3)
    e1=triangles[:,1]-triangles[:,0]; e2=triangles[:,2]-triangles[:,0]
    hits=set(); eps=1e-8
    for ti,triangle in enumerate(triangles):
        for a,b in zip(triangle,np.roll(triangle,-1,axis=0)):
            direction=b-a; h=np.cross(direction,e2)
            determinant=np.einsum('ij,ij->i',e1,h); valid=abs(determinant)>eps
            inverse=np.where(valid,1/np.where(valid,determinant,1),0)
            delta=a-triangles[:,0]; u=inverse*np.einsum('ij,ij->i',delta,h)
            q=np.cross(delta,e1); v=inverse*(q@direction)
            distance=inverse*np.einsum('ij,ij->i',e2,q)
            found=valid&(u>eps)&(v>eps)&(u+v<1-eps)&(distance>eps)&(distance<1-eps)
            for j in np.flatnonzero(found): hits.add(tuple(sorted([ti,int(j)])))
    return {'file':str(path),'proper_crossings':len(hits),'pairs':sorted(hits),
            'limitations':'Bind space only; coplanar overlaps and tangent contacts are not tested.'}

def unit(v):
    v = np.asarray(v, dtype=float)
    return v / max(float(np.linalg.norm(v)), 1e-12)

def linear(c):
    c=np.asarray(c)/255
    return np.where(c<=.04045,c/12.92,((c+.055)/1.055)**2.4)

def srgb(c):
    c=np.asarray(c)
    return np.clip(np.where(c<=.0031308,c*12.92,1.055*np.maximum(c,0)**(1/2.4)-.055)*255,0,255)

class Mesh:
    def __init__(self): self.v=[]; self.w=[]; self.f=[]
    def vertex(self,p,w):
        self.v.append(np.asarray(p,dtype=float)); self.w.append(w.copy()); return len(self.v)-1
    def ring(self,c,rx,rz,w,n=12,exponent=1):
        return [self.vertex(np.asarray(c)+[rx*np.sign(math.sin(a))*abs(math.sin(a))**exponent,0,rz*np.sign(math.cos(a))*abs(math.cos(a))**exponent],w) for a in np.arange(n)*math.tau/n]
    def bridge(self,a,b,skip=()):
        assert len(a)==len(b)
        for i in range(len(a)):
            if i in skip: continue
            j=(i+1)%len(a)
            self.f.extend([(a[i],a[j],b[j]),(a[i],b[j],b[i])])
    def cap(self,a,p,w):
        k=self.vertex(p,w)
        self.f.extend([(a[i],a[(i+1)%len(a)],k) for i in range(len(a))])
    def orient(self):
        # Propagate consistent winding then use enclosed signed volume for outward.
        edges=defaultdict(list)
        for i,f in enumerate(self.f):
            for a,b in zip(f,(*f[1:],f[0])): edges[tuple(sorted((a,b)))].append((i,a,b))
        assert all(len(x)==2 for x in edges.values()), 'unclosed authored topology'
        adjacent=defaultdict(list)
        for e in edges.values():
            (a,x,y),(b,u,v)=e
            adjacent[a].append((b,x==u)); adjacent[b].append((a,x==u))
        flips={0:False}; todo=[0]
        while todo:
            a=todo.pop()
            for b,reverse in adjacent[a]:
                value=flips[a]^reverse
                if b in flips: assert flips[b]==value
                else: flips[b]=value; todo.append(b)
        assert len(flips)==len(self.f), 'disconnected shell'
        self.f=[(f[0],f[2],f[1]) if flips[i] else f for i,f in enumerate(self.f)]
        volume=sum(np.dot(self.v[a],np.cross(self.v[b],self.v[c]))/6 for a,b,c in self.f)
        if volume<0: self.f=[(a,c,b) for a,b,c in self.f]
        normals=np.zeros((len(self.v),3))
        for a,b,c in self.f:
            nr=np.cross(self.v[b]-self.v[a],self.v[c]-self.v[a])
            for i in (a,b,c): normals[i]+=nr
        self.normal=np.array([unit(n) for n in normals])

def make(sid,variant):
    supported_variants={f'v{number}':number for number in range(1,16)}
    if variant not in supported_variants:
        raise ValueError(f'Unknown clean-base variant {variant!r}; expected v1 through v15')
    if sid not in ('eric','mio'):
        raise ValueError(f'Unknown clean-base source {sid!r}; expected eric or mio')
    revision=supported_variants[variant]
    srcpath=OUT/f'src-{sid}.json'; S=json.loads(srcpath.read_text())
    P={k:np.array(v) for k,v in S['P'].items()}; m=Mesh()
    eric=sid=='eric'; scale=1 if eric else .94
    motion_revision=revision>=6
    fitted_head=revision>=7
    rounded_shoulder=revision>=9
    hand_clearance=revision>=10
    convex_skull=revision>=11
    deltoid_transition=revision>=12
    graded_hips=revision>=13
    revised=revision>=2
    sole=0.0 if revised else .013
    hips=P['Hips'][1]; chest=P['Spine'][1]; neck=P['neck'][1]
    # Six torso rings; chest opening edges are reused by the arms.
    specs=[(hips-.032,.083,.052,0,{'Hips':1}),
           (hips+.010,.088,.057,-.004,{'Hips':.8,'Spine02':.2}),
           (P['Spine02'][1]+.008,.076,.049,-.009,{'Spine02':.7,'Spine01':.3}),
           (chest-.030,.087,.052,-.016,{'Spine01':.4,'Spine':.6}),
           (neck+.002,.090,.045,-.023,{'Spine':1}),
           (neck+.017,.035,.031,-.026,{'Spine':.25,'neck':.75}),
           (P['Head'][1]+.010,.035,.031,-.025,{'neck':.35,'Head':.65})]
    if not eric and revision>=8:
        specs[-1]=(P['Head'][1]-.015,.035,.031,-.025,{'neck':.35,'Head':.65})
    rings=[m.ring([0,y,z],rx*scale,rz,w) for y,rx,rz,z,w in specs]
    if graded_hips:
        for index,vertex in enumerate(rings[0]):
            if index in (0,6):
                m.w[vertex]={'Hips':.8,'LeftUpLeg':.1,'RightUpLeg':.1}
            else:
                side='Left' if index<6 else 'Right'
                amount=.25 if index in (1,5,7,11) else .35
                m.w[vertex]={'Hips':1-amount,side+'UpLeg':amount}
    if motion_revision:
        for side,start in [('Left',2),('Right',8)]:
            for row,amounts in [(3,[.2,.45,.2]),(4,[.5,.8,.5])]:
                for index,amount in zip(range(start,start+3),amounts):
                    m.w[rings[row][index]]={'Spine':1-amount,side+'Arm':amount}
    if deltoid_transition:
        # Lift the armpit into the torso and lower the outside shoulder slightly.
        # This replaces the horizontal under-arm shelf with a descending curve.
        for start in (2,8):
            for index,drop in zip(range(start,start+3),(.004,.008,.004)):
                m.v[rings[4][index]][1]-=drop
            for index,lift in zip(range(start,start+3),(.003,.007,.003)):
                m.v[rings[3][index]][1]+=lift
    for k in range(len(rings)-1): m.bridge(rings[k],rings[k+1],skip=(2,3,8,9) if k==3 else ())
    # Broad rounded head, curved jaw, full skull. The neck connects underneath.
    head0=P['Head'][1]
    hs=([(head0+.021,.097,.084),(head0+.045,.151,.140),(head0+.090,.177,.176),
         (head0+.160,.185,.182),(head0+.235,.181,.177),(head0+.300,.155,.156),
         (head0+.355,.105,.113),(head0+.382,.052,.060)] if eric else
        [(head0+.018,.102,.085),(head0+.038,.163,.140),(head0+.076,.196,.180),
         (head0+.137,.207,.188),(head0+.201,.199,.182),(head0+.260,.168,.160),
         (head0+.303,.111,.116),(head0+.322,.054,.060)])
    if motion_revision and not eric:
        hs=[(head0-.032,.105,.085),(head0-.010,.165,.145),(head0+.027,.196,.185),
            (head0+.100,.207,.188),(head0+.181,.199,.182),(head0+.250,.168,.160),
            (head0+.303,.111,.116),(head0+.322,.054,.060)]
    # Hair encloses a narrower nape than the front face. Ringwise front/back
    # profiles preserve that rounded skull silhouette without pushing
    # individual points into noisy garment or hair triangle folds.
    # Dimensions are hand-authored after inspecting source contour samples;
    # they are not measured automatically from the clothed mesh.
    profiles=None
    if fitted_head:
        profiles=([(head0+.015,.105,.115,-.020),(head0+.040,.145,.129,-.060),
                   (head0+.085,.163,.136,-.145),(head0+.150,.168,.145,-.160),
                   (head0+.225,.162,.150,-.152),(head0+.295,.146,.154,-.178),
                   (head0+.355,.105,.120,-.163),(head0+.382,.050,.060,-.118)] if eric else
                  [(head0-.010,.105,.085,-.055),(head0+.008,.161,.126,-.090),
                   (head0+.040,.183,.129,-.145),(head0+.100,.193,.132,-.204),
                   (head0+.181,.190,.132,-.217),(head0+.250,.168,.140,-.213),
                   (head0+.303,.111,.110,-.185),(head0+.322,.054,.040,-.112)])
        hs=[(y,rx,(front-back)/2) for y,rx,front,back in profiles]
        if convex_skull and eric:
            back_profile=[-.020,-.060,-.115,-.158,-.176,-.177,-.150,-.108]
            if revision>=13:
                # The nape must meet the neck's back (-.056), rather than cut
                # inward and back out over two adjacent rings.
                back_profile=[-.055,-.090,-.130,-.158,-.176,-.177,-.150,-.108]
            profiles=[(y,rx,front,back) for (y,rx,front,_),back in zip(profiles,back_profile)]
            hs=[(y,rx,(front-back)/2) for y,rx,front,back in profiles]
    if revision>=15:
        # Retain jaw, widest face, brow and crown contours. Remove the two
        # intermediate rounding bands so larger planes connect those landmarks.
        keep=[0,1,3,4,6,7]
        hs=[hs[i] for i in keep]
        if profiles: profiles=[profiles[i] for i in keep]
    last=rings[-1]
    head_ids=set(last)
    for ring_index,(y,rx,rz) in enumerate(hs):
        center_z=(profiles[ring_index][2]+profiles[ring_index][3])/2 if profiles else -.035
        r=m.ring([P['Head'][0],y,center_z],rx,rz,{'Head':1},exponent=.88)
        m.bridge(last,r); last=r; head_ids.update(r)
    m.cap(last,[P['Head'][0],hs[-1][0]+.012,-.035],{'Head':1}); head_ids.add(len(m.v)-1)
    # Shoulder openings use six vertices each. Rings follow the actual arm axis.
    for side,start in [('Left',2),('Right',8)]:
        a,b=P[side+'Arm'],P[side+'ForeArm']; h=P[side+'Hand']; axis=unit(h-a)
        boundary=[rings[3][start],rings[3][start+1],rings[3][start+2],rings[4][start+2],rings[4][start+1],rings[4][start]]
        center=np.mean([m.v[i] for i in boundary],axis=0)
        directions=[unit((m.v[i]-center)-axis*np.dot(m.v[i]-center,axis)) for i in boundary]
        # Even six-sided rings avoid concentrating vertices at the side seam.
        e0=directions[0]; e1=unit(np.cross(axis,e0))
        if np.dot(e1,directions[1])<0:e1=-e1
        directions=[math.cos(i*math.tau/6)*e0+math.sin(i*math.tau/6)*e1 for i in range(6)]
        start_fraction=.50 if revision>=3 else .22
        start_radius=.033 if revision>=3 else .037
        if not eric and revision>=4:
            start_fraction=.60
        if rounded_shoulder:start_fraction=.50
        stages=[(a*(1-start_fraction)+b*start_fraction,start_radius,{side+'Arm':.9,'Spine':.1}),
                (a*.25+b*.75,.033,{side+'Arm':.8,side+'ForeArm':.2}),
                (b,.031,{side+'Arm':.5,side+'ForeArm':.5}),
                (b*.5+h*.5,.028,{side+'ForeArm':1}),
                (h,.024,{side+'ForeArm':.3,side+'Hand':.7}),
                (h+axis*.030,.032,{side+'Hand':1}),
                (h+axis*.059,.027,{side+'Hand':1})]
        if not eric and revision>=5 and not rounded_shoulder:
            c,r,w=stages[0]
            stages[0]=(c+np.array([.012 if side=='Left' else -.012,0,0]),r,w)
        if motion_revision:
            lateral=np.array([.025 if side=='Left' else -.025,0,0])
            stages=[(c+lateral,r,w) for c,r,w in stages]
        if convex_skull and not eric:
            # Keep shoulder clearance through both rest-frame conventions. A
            # gradual upper-arm curve replaces the old single-ring bulge.
            offsets=[.012,.008,.004,0,0,0,0]
            sign=1 if side=='Left' else -1
            stages=[(c+np.array([sign*offset,0,0]),r,w)
                    for (c,r,w),offset in zip(stages,offsets)]
        if revision>=14:
            sign=1 if side=='Left' else -1
            stages=[(c+np.array([sign*offset,0,0]),r,w)
                    for (c,r,w),offset in zip(stages,(.004,.002,0,0,0,0,0))]
        last=boundary
        for stage_index,(c,r,w) in enumerate(stages):
            ring=[]
            for direction in directions:
                point=c+direction*r*scale
                if deltoid_transition and stage_index<2:
                    # The first existing ring leans down into the upper arm;
                    # subsequent rings and all x/z widths stay unchanged.
                    point[1]+=(-.010+.15*(point[1]-c[1])) if stage_index==0 else -.004
                ring.append(m.vertex(point,w))
            m.bridge(last,ring);last=ring
        m.cap(last,h+axis*.070+(lateral if motion_revision else 0),{side+'Hand':1})
    # One crotch vertex joins the two eight-sided leg openings to the pelvis.
    crotch_weights={'Hips':.8,'LeftUpLeg':.1,'RightUpLeg':.1} if graded_hips else {'Hips':1}
    crotch=m.vertex([0,hips-.039,0],crotch_weights)
    for side,inds in [('Left',list(range(7))),('Right',list(range(6,12))+[0])]:
        last=[rings[0][i] for i in inds]+[crotch]
        upper,knee,foot=P[side+'UpLeg'],P[side+'Leg'],P[side+'Foot']
        center=np.mean([m.v[i] for i in last],axis=0)
        ang=np.array([math.atan2(m.v[i][0]-center[0],m.v[i][2]-center[2]) for i in last])
        # Preserve boundary ordering, place following rings at regular angles.
        angles=np.unwrap(ang);sgn=1 if np.mean(np.diff(angles))>0 else -1
        angles=angles[0]+sgn*np.arange(8)*math.tau/8
        stages=[(upper*.68+knee*.32,.046,.046,{side+'UpLeg':.85,'Hips':.15}),
                (upper*.20+knee*.8,.041,.042,{side+'UpLeg':.85,side+'Leg':.15}),
                (knee,.039,.040,{side+'UpLeg':.5,side+'Leg':.5}),
                (knee*.55+foot*.45,.035,.036,{side+'Leg':1}),
                (foot,.029,.031,{side+'Leg':.3,side+'Foot':.7}),
                (np.array([foot[0],.041,foot[2]+.017]),.042,.061,{side+'Foot':1}),
                (np.array([foot[0],.019,foot[2]+.020]),.043,.065,{side+'Foot':1}),
                (np.array([foot[0],sole,foot[2]+.020]),.033,.055,{side+'Foot':1})]
        for c,rx,rz,w in stages:
            ring=[m.vertex(c+[math.sin(t)*rx,0,math.cos(t)*rz],w) for t in angles]
            m.bridge(last,ring);last=ring
        m.cap(last,[foot[0],sole,foot[2]+.020],{side+'Foot':1})
    if hand_clearance and not eric:
        # A small continuous arm offset prevents the corrected walk's inward
        # hand swing from passing through the thigh. Radius stays unchanged.
        for i,w in enumerate(m.w):
            left=w.get('LeftForeArm',0)+w.get('LeftHand',0)
            right=w.get('RightForeArm',0)+w.get('RightHand',0)
            m.v[i][0]+=.020*(left-right)
    m.orient()
    # Source texture projection, front-facing head only, features at original x/y.
    tex=np.asarray(Image.open(ROOT/'art/parts'/S['tex']).convert('RGB'))
    srcpos=np.array(S['pos']).reshape(-1,3,3); srcuv=np.array(S['uv']).reshape(-1,3,2)
    srccol=np.array(S['col']).reshape(-1,3,3); srcuse=np.array(S['useTex']).reshape(-1,3)
    # Neutral skin swatches; facial artwork is sampled from the existing source.
    skin8=np.array([250,217,200] if eric else [247,227,216]); skin=linear(skin8)
    size=1024; canvas=np.broadcast_to(skin8,(size,size,3)).copy().astype(np.uint8)
    zbuf=np.full((size,size),-np.inf); xlo,xhi=-.24,.24; ylo,yhi=.48,.97
    eyehi=head0+(.213 if eric else .150); eyelo=head0+.018
    for ti,ps in enumerate(srcpos):
        if S['slot'][ti]!='head':continue
        nr=unit(np.cross(ps[1]-ps[0],ps[2]-ps[0]))
        if nr[2]<.20:continue
        xy=np.column_stack(((ps[:,0]-xlo)/(xhi-xlo)*(size-1),(yhi-ps[:,1])/(yhi-ylo)*(size-1)))
        xmin,ymin=np.maximum(np.floor(xy.min(0)).astype(int),0);xmax,ymax=np.minimum(np.ceil(xy.max(0)).astype(int),size-1)
        if xmin>xmax or ymin>ymax:continue
        xx,yy=np.meshgrid(np.arange(xmin,xmax+1),np.arange(ymin,ymax+1));q=np.stack((xx,yy),axis=-1)
        a,b,c=xy;v0=b-a;v1=c-a;den=v0[0]*v1[1]-v1[0]*v0[1]
        if abs(den)<1e-8:continue
        d=q-a;u=(d[...,0]*v1[1]-d[...,1]*v1[0])/den;v=(v0[0]*d[...,1]-v0[1]*d[...,0])/den;w=np.stack((1-u-v,u,v),axis=-1)
        xyz=w@ps; z=xyz[...,2]
        ok=(w.min(-1)>=-1e-6)&(z>zbuf[ymin:ymax+1,xmin:xmax+1])&(xyz[...,1]<eyehi)&(xyz[...,1]>eyelo)&(abs(xyz[...,0])<(.143 if eric else .151))
        if not ok.any():continue
        if srcuse[ti].mean()>.5:
            uv=w@srcuv[ti];ix=np.clip((uv[...,0]*tex.shape[1]).astype(int),0,tex.shape[1]-1);iy=np.clip((uv[...,1]*tex.shape[0]).astype(int),0,tex.shape[0]-1);rgb=tex[iy,ix]
        else:rgb=srgb(w@srccol[ti]).astype(np.uint8)
        # Keep ink/eye colours and light highlights, unify skin to avoid baked dents.
        spread=rgb.max(-1).astype(float)-rgb.min(-1);dark=rgb.mean(-1)<155
        feature=dark|((rgb[...,2].astype(float)>rgb[...,0]+8)&(spread>25))|(rgb.min(-1)>235)
        if revised:
            # Only the two eye/brow regions are facial ink. Source head triangles
            # include painted sideburns/fringe; excluding their geometry alone
            # cannot remove those colours. Keep the original ink inside these
            # measured regions rather than redraw or replace the eyes.
            ax=abs(xyz[...,0]-P['Head'][0]); yy3=xyz[...,1]
            if eric:
                region=(ax>.028)&(ax<.119)&(yy3>.586)&(yy3<.735)
                if motion_revision:region &= yy3<.720
            else:
                region=(ax>.028)&(ax<.124)&(yy3>.553)&(yy3<.668)
            feature &= region
        rgb=np.where(feature[...,None],rgb,skin8)
        patch=canvas[ymin:ymax+1,xmin:xmax+1];patch[ok]=rgb[ok];zbuf[ymin:ymax+1,xmin:xmax+1][ok]=z[ok]
    # Plain skin sample in corner is also used by the body and rear head triangles.
    name=f'clean-{sid}-{variant}';Image.fromarray(canvas).save(OUT/f'{name}.png')
    out={k:[] for k in ['pos','normal','uv','si','sw']}
    for f in m.f:
        centroid=np.mean([m.v[i] for i in f],axis=0)
        front=all(i in head_ids for i in f) and centroid[2]>.045
        face_normal=unit(np.cross(m.v[f[1]]-m.v[f[0]],m.v[f[2]]-m.v[f[0]]))
        for i in f:
            p=m.v[i];out['pos'].extend(np.round(p,6).tolist());out['normal'].extend(np.round(face_normal if revision>=15 else m.normal[i],6).tolist())
            out['uv'].extend([(p[0]-xlo)/(xhi-xlo),(yhi-p[1])/(yhi-ylo)] if front else [.01,.01])
            ws=sorted(m.w[i].items(),key=lambda x:-x[1]); total=sum(v for _,v in ws)
            out['si'].extend([S['bones'].index(b) for b,_ in ws]+[0]*(4-len(ws)))
            out['sw'].extend([round(v/total,6) for _,v in ws]+[0]*(4-len(ws)))
    # Stubble is a removable original layer, never part of the closed base surface.
    stubble=[]
    if eric:
        for ti,ps in enumerate(srcpos):
            c=ps.mean(0);nr=unit(np.cross(ps[1]-ps[0],ps[2]-ps[0]))
            if S['slot'][ti]=='hair' and head0-.04<c[1]<head0+.18 and nr[2]>-.2 and abs(c[0])<.2:stubble.append(ti)
    out.update(id=name,source=sid,tex=f'base/{name}.png',skin=skin.tolist(),T=len(m.f),stubble=stubble,
        construction={'method':'authored connected edge loops','vertices':len(m.v),'triangles':len(m.f),'sourceSha256':hashlib.sha256(srcpath.read_bytes()).hexdigest(),'generator':'tools/creator/base/build_clean_base.py','variant':variant},
        check={'boundary':0,'nonmanifold':0,'pieces':1})
    if revision>=15: out['shading']='flat'
    (OUT/f'{name}.json').write_text(json.dumps(out,separators=(',',':')))
    print(name,len(m.v),'vertices',len(m.f),'triangles',flush=True)

if __name__=='__main__':
    if len(sys.argv)>1 and sys.argv[1]=='--check':
        for filename in sys.argv[2:]: print(json.dumps(check_crossings(filename),indent=2))
    else:
        make(sys.argv[1] if len(sys.argv)>1 else 'eric',sys.argv[2] if len(sys.argv)>2 else 'v1')
