"""Authored low-poly hoodie, cargo trousers and sneakers. Every open edge has a closed inner rim."""
import math
from mathutils import Vector
import common as C
from shapes import chain_weights,smooth
from mesh import Mesh,X,Y,Z,solidify
from weights import upper_garment

def material(name,color):return C.flat_material('astra-'+name,C.hex_rgba(color))

def build(body,arm,H,J,body_obj,body_mesh):
    blue=body=='mio'; outer=material('hoodie','#223661' if blue else '#858b98'); lining=material('lining','#15233e' if blue else '#535c6c'); rib=material('rib','#1a2b4d' if blue else '#636c7d'); accent=material('accent','#20c9d4' if blue else '#e1e4eb')
    navy=material('trousers','#202e50'); navyin=material('trousers-inside','#16213a'); sole=material('sole','#edf0f5'); shoe=material('sneaker','#1b2b49'); shoetop=material('shoe-accent','#28bfca' if blue else '#f5f4ef')
    mats={'outer':outer,'inner':lining,'rib':rib,'accent':accent}
    spine=[('Hips',J['Hips']-Z*.08),('Spine02',J['Spine02']),('Spine01',J['Spine01']),('Spine',J['Spine']),('neck',J['neck']),(None,J['Head'])]
    wf=lambda p:chain_weights(p,spine,.022)
    sy=J['Spine'].y
    def torso_y(z):
        t=max(0,min(1,(z-J['Hips'].z)/(J['Spine'].z-J['Hips'].z)))
        return J['Hips'].y*(1-t)+sy*t
    # The hoodie is one connected garment: sleeve joins share torso vertices.
    M=Mesh();rows=[(.302,.108,.081),(.318,.110,.084),(.382,.100,.086),(.425,.098,.067),(.495,.089,.064),(.510,.046,.039)]
    rr=[M.ring((0,torso_y(z),z),rx,ry,16,wf(Vector((0,torso_y(z),z))),phase=0) for z,rx,ry in rows]
    for i in range(len(rr)-1):M.bridge(rr[i],rr[i+1],'rib' if i==0 else 'outer',skip=(14,15,0,1,6,7,8,9) if i==3 else ())
    for side,ids in [('Left',[14,15,0,1,2]),('Right',[6,7,8,9,10])]:
        sh,el,wr=[J[side+k] for k in ['Arm','ForeArm','Hand']];d=(wr-el).normalized()
        chain=[(side+'Shoulder',J[side+'Shoulder']),(side+'Arm',sh),(side+'ForeArm',el),(side+'Hand',wr),(None,wr+d*.07)]
        aw=lambda p:chain_weights(p,chain,.026)
        boundary=[rr[3][i] for i in ids]+[rr[4][i] for i in reversed(ids)]
        pts=[sh.lerp(el,.25),sh.lerp(el,.70),el,el.lerp(wr,.55),wr-d*.020,wr-d*.003]
        radii=[.044,.046,.046,.047,.037,.029]
        rings=M.tube(pts,radii,aw,'outer',n=10,closed=False)
        end=M.aligned(boundary,rings[0])
        last=boundary
        axis=(el-sh).normalized()
        for t in [.35,.7]:
            pts=[M.v[a].lerp(M.v[b],t) for a,b in zip(boundary,end)]
            centre=sum(pts,Vector())/len(pts)
            mid=[]
            for p in pts:
                radial=p-centre;radial-=axis*radial.dot(axis)
                p=p+(radial.normalized()*.010 if radial.length else Vector())
                mid.append(M.vertex(p,aw(p)))
            M.bridge(last,mid,'outer');last=mid
        M.bridge(last,end,'outer')
        # Last sleeve band is a narrow rib cuff, closed into lining by Solidify.
        for i,face in enumerate(M.f):
            if all(v in set(rings[-1]+rings[-2]) for v in face):M.tags[i]='rib'
    # A small inner fabric gusset follows the skin exactly beneath the folding sleeve join.
    # It is real solidified cloth, inside this same garment, and is hidden with the hoodie.
    outer_count=len(M.v);copied={}
    for poly,tag in zip(body_obj.data.polygons,body_mesh.tags):
        c=poly.center/H
        if tag!='skin' or not (.40<c.z<.505 and .025<abs(c.x)<.18):continue
        ids=[]
        for vi in poly.vertices:
            if vi not in copied:
                vertex=body_obj.data.vertices[vi]
                copied[vi]=M.vertex(body_mesh.v[vi]+vertex.normal*.007,body_mesh.w[vi])
            ids.append(copied[vi])
        M.face(ids,'outer')
    ob=M.object(body+'-hoodie',H,arm,body,mats)
    upper_garment(ob,body_obj,body_mesh,H,outer_count)
    solidify(ob,.0045,H)
    # Back hood is an open lined bowl; the closed bottom holds volume away from the back.
    M=Mesh();cy=J['neck'].y+.068
    rings=[]
    for z,rx,ry,yy in [(.432,.037,.025,cy+.012),(.454,.066,.045,cy+.018),(.493,.074,.057,cy+.010),(.520,.063,.042,cy)]:
        rings.append(M.ring((0,yy,z),rx,ry,16,wf(Vector((0,yy,z)))))
    for a,b in zip(rings,rings[1:]):M.bridge(a,b,'outer')
    M.cap(rings[0],'outer')
    hood=M.object(body+'-hood',H,arm,body,{'outer':outer,'inner':lining});solidify(hood,.006,H)
    # Front fastening and two inset pocket welts follow the torso without radial shrinkwrap.
    D=Mesh()
    def cloth_front(x,z):
        for a,b in zip(rows,rows[1:]):
            if z<=b[0]:
                t=max(0,min(1,(z-a[0])/(b[0]-a[0])))
                rx=a[1]*(1-t)+b[1]*t;ry=a[2]*(1-t)+b[2]*t
                return torso_y(z)-ry*math.sqrt(max(.01,1-(x/rx)**2))
        return torso_y(z)-rows[-1][2]
    def patch(x0,x1,z0,z1,offset,tag):
        a=[D.vertex((x,cloth_front(x,z)-offset,z),wf(Vector((0,torso_y(z),z)))) for x,z in [(x0,z0),(x1,z0),(x1,z1),(x0,z1)]]
        D.face(a,tag)
    ziprows=[]
    for z,depth in [(.314,.085),(.382,.087),(.425,.068),(.495,.065),(.505,.049)]:
        ziprows.append([D.vertex((x,torso_y(z)-depth,z),wf(Vector((x,torso_y(z)-depth,z)))) for x in [-.003,.003]])
    for a,b in zip(ziprows,ziprows[1:]):D.face([a[0],a[1],b[1],b[0]],'accent')
    for sx in [-1,1]:
        a,b=sorted([sx*.053,sx*.087]);patch(a,b,.327,.351,.004,'rib');patch(a,b,.348,.356,.006,'outer')
    ob=D.object(body+'-zip',H,arm,body,mats);solidify(ob,.0015,H)
    # Connected seat and legs, with a real crotch instead of intersecting trouser cylinders.
    M=Mesh(); waist=M.ring((0,J['Hips'].y,.344),.092,.063,16,{'Hips':1});low=M.ring((0,J['Hips'].y,.293),.105,.067,16,{'Hips':1});M.bridge(waist,low,'outer')
    crotch=M.vertex((0,J['Hips'].y,.273),{'Hips':1})
    for side,ids,sx in [('Left',list(range(12,16))+list(range(0,5)),1),('Right',list(range(4,13)),-1)]:
        hip,knee,ank,toe=[J[side+k] for k in ['UpLeg','Leg','Foot','Toe']]
        chain=[(side+'UpLeg',hip),(side+'Leg',knee),(side+'Foot',ank),(None,toe)]
        lw=lambda p:chain_weights(p,chain,.023)
        ax=sx*.056
        points=[Vector((ax,hip.y+(knee.y-hip.y)*.5,.26)),Vector((ax,knee.y,.19)),Vector((ax,ank.y,.105)),Vector((ax,ank.y,.076)),Vector((ax,ank.y,.064))]
        radii=[.053,.057,.058,.049,.041]
        lr=[M.ring(p,r,r*1.04,10,lw(p)) for p,r in zip(points,radii)]
        boundary=[low[i] for i in ids]+[crotch];M.bridge(boundary,M.aligned(boundary,lr[0]),'outer')
        for i,(a,b) in enumerate(zip(lr,lr[1:])):M.bridge(a,b,'rib' if i==3 else 'outer')
    pants=M.object(body+'-trousers',H,arm,body,{'outer':navy,'inner':navyin,'rib':navyin});solidify(pants,.004,H)
    # Raised cargo pockets: a shallow six-sided box with an overhanging flap, weighted to its thigh.
    P=Mesh()
    for sx,side in [(1,'Left'),(-1,'Right')]:
        x0,x1=sorted([sx*.101,sx*.126]);y0=J[side+'UpLeg'].y-.016;w={side+'UpLeg':1}
        def box(xa,xb,ya,yb,za,zb,tag):
            vs=[P.vertex((x,y,z),w) for z in [za,zb] for y in [ya,yb] for x in [xa,xb]]
            for inds in [[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]]:P.face([vs[i] for i in inds],tag)
        box(x0,x1,y0-.031,y0+.012,.206,.265,'outer');box(x0-.002,x1+.002,y0-.036,y0+.014,.258,.271,'rib')
        if blue:box(x0+.003,x1-.003,y0-.037,y0-.034,.254,.271,'accent')
    P.object(body+'-pockets',H,arm,body,{'outer':navy,'rib':navyin,'accent':accent})
    # Shoes use a horizontal sole outline, a broad low toe, and a distinct raised vamp.
    M=Mesh()
    for side,sx in [('Left',1),('Right',-1)]:
        ank=J[side+'Foot'];ax=sx*.056;ay=ank.y-.035
        def shoe_weight(y):
            t=smooth(ank.y-.014,ank.y-.065,y)
            return {side+'Foot':1-t,side+'Toe':t}
        outline=[(-.035,.068),(-.044,.042),(-.047,-.042),(-.034,-.073),(0,-.080),(.034,-.073),(.047,-.042),(.044,.042),(.035,.068)]
        rings=[]
        for z,scale in [(.004,1),(.022,1.03),(.030,1),(.062,.83)]:
            rings.append([M.vertex((ax+x*scale,ay+y*scale,z+(max(0,y)*.23 if z>.03 else 0)),shoe_weight(ay+y*scale)) for x,y in outline])
        M.cap(rings[0],'sole')
        for i,(a,b) in enumerate(zip(rings,rings[1:])):M.bridge(a,b,'sole' if i<2 else 'upper')
        M.cap(rings[-1],'upper')
        # two broad lace/vamp bars, lying on the sloped upper surface
        for yy in [-.013,.002]:
            bars=[]
            for z in [.0645,.067]:
                bars.append([M.vertex((ax+x,ay+yy+y,z),shoe_weight(ay+yy+y)) for x,y in [(-.024,-.004),(.024,-.004),(.024,.004),(-.024,.004)]])
            M.cap(bars[0],'accent');M.bridge(bars[0],bars[1],'accent');M.cap(bars[1],'accent')
    M.object(body+'-sneakers',H,arm,body,{'upper':shoe,'sole':sole,'accent':shoetop})
