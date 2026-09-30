"""Continuous torso/shoulders/hips and an authored convex head with original eye coordinates."""
from mathutils import Vector
import common as C
from shapes import chain_weights
from mesh import Mesh,X,Y,Z

SKIN={'mio':'#f7e3d8','eric':'#f6dccf'}

def build(body,arm,original,H):
    J={k:v/H for k,v in C.joints(arm,body).items()}; M=Mesh()
    spine=[('Hips',J['Hips']-Z*.09),('Spine02',J['Spine02']),('Spine01',J['Spine01']),('Spine',J['Spine']),('neck',J['neck']),('Head',J['Head']),(None,J['head_end'])]
    def wt(p):return chain_weights(Vector((0,J['Spine'].y,p.z)),spine,.022)
    def cy(z):
        pts=[J[k] for k in ['Hips','Spine02','Spine01','Spine','neck']]
        for a,b in zip(pts,pts[1:]):
            if z<=b.z:return a.y+(b.y-a.y)*max(0,min(1,(z-a.z)/(b.z-a.z)))
        return pts[-1].y
    # No stacked cylinders: open shoulder panels and shared hip/crotch vertices bridge into limbs.
    rows=[(.31,.073,.046),(.35,.075,.048),(.395,.078,.050),(.428,.083,.053),(.482,.075,.043),(.50,.034,.030)]
    if body=='mio':rows=[(.32,.071,.048),(.355,.073,.049),(.40,.073,.047),(.428,.076,.050),(.482,.071,.042),(.497,.031,.028)]
    rr=[M.ring((0,cy(z),z),rx,ry,16,wt(Vector((0,0,z)))) for z,rx,ry in rows]
    for i in range(len(rr)-1):M.bridge(rr[i],rr[i+1],skip=(14,15,0,1,6,7,8,9) if i==3 else ())
    # shoulders have four-panel openings (10 boundary vertices); taper them directly into arms
    for side,inds in [('Left',[14,15,0,1,2]),('Right',[6,7,8,9,10])]:
        sh,el,wr=[J[side+k] for k in ['Arm','ForeArm','Hand']];d=(wr-el).normalized();tip=wr+d*.065
        chain=[(side+'Shoulder',J[side+'Shoulder']),(side+'Arm',sh),(side+'ForeArm',el),(side+'Hand',wr),(None,tip)]
        wf=lambda p:chain_weights(p,chain,.023)
        boundary=[rr[3][i] for i in inds]+[rr[4][i] for i in reversed(inds)]
        pts=[sh.lerp(el,.20),sh.lerp(el,.62),el,el.lerp(wr,.55),wr,wr+d*.025,wr+d*.05,tip]
        radii=[.029,.027,.025,.022,.019,.024,.023,.012]
        rings=M.tube(pts,radii,wf,n=10,closed=False)
        M.bridge(boundary,M.aligned(boundary,rings[0]));M.cap(rings[-1])
        # thumb is a small tapered pad with a broad base, intersecting the mitten palm
        thumb=wr+d*.025-Y*.018
        M.tube([thumb,thumb+d*.013-Y*.009,thumb+d*.025-Y*.007],[.009,.009,.004],wf,n=8)
    # Two leg openings share the centre seam and the trunk's lowest ring.
    crotch=M.vertex((0,cy(rows[0][0]),rows[0][0]-.025),{'Hips':1})
    for side,ids,sx in [('Left',list(range(12,16))+list(range(0,5)),1),('Right',list(range(4,13)),-1)]:
        hip,knee,ank,toe=[J[side+k] for k in ['UpLeg','Leg','Foot','Toe']]
        chain=[(side+'UpLeg',hip),(side+'Leg',knee),(side+'Foot',ank),(side+'Toe',toe),(None,toe-Y*.08)]
        wf=lambda p:chain_weights(p,chain,.022)
        boundary=[rr[0][i] for i in ids]+[crotch]
        ax=.051 if body=='mio' else .049
        points=[Vector((sx*ax,hip.y,.285)),Vector((sx*(ax+.001),knee.y,.225)),Vector((sx*(ax+.002),knee.y,knee.z)),Vector((sx*(ax+.003),(knee.y+ank.y)/2,(knee.z+ank.z)/2)),Vector((sx*(ax+.004),ank.y,.035))]
        radii=[.043,.037,.031,.030,.024]
        # Horizontal rings keep the projected leg edges straight, independent of knee-depth on the rig.
        lr=[M.ring(p,r,r*.94,10,wf(p)) for p,r in zip(points,radii)]
        M.bridge(boundary,M.aligned(boundary,lr[0]));
        for a,b in zip(lr,lr[1:]):M.bridge(a,b)
        M.cap(lr[-1])
        # A small single foot volume, broad rounded toe and flat sole, no detached ellipsoid.
        ar=points[-1]
        foot=[]
        for y,w,h in [(ank.y+.022,.026,.024),(ank.y,.030,.044),(ank.y-.055,.035,.028),(ank.y-.095,.028,.022)]:
            r=M.ring((ar.x,y,h/2+.004),w,h/2,10,wf(Vector((ar.x,y,.02))),X,Z)
            foot.append(r)
        for a,b in zip(foot,foot[1:]):M.bridge(a,b)
        M.cap(foot[0]);M.cap(foot[-1])
    # The neck grows from the same torso ring and penetrates the skull.
    last=rr[-1]
    for z,r in [(.523,.029),(.55,.028),(.60,.028)]:
        ring=M.ring((0,J['neck'].y,z),r,r*.94,16,wt(Vector((0,0,z))));M.bridge(last,ring);last=ring
    M.cap(last)
    # Face coordinates preserve the original eyes. Side and back use an authored round skull.
    if body=='mio':head=[(.505,.025,.025,-.105),(.527,.073,.060,-.075),(.560,.122,.102,-.038),(.605,.158,.143,-.008),(.66,.176,.165,0),(.72,.182,.172,0),(.78,.175,.166,0),(.84,.143,.145,0),(.885,.08,.085,0)]
    else:head=[(.532,.027,.015,-.110),(.550,.075,.058,-.080),(.579,.126,.105,-.045),(.625,.157,.149,-.015),(.68,.168,.167,-.012),(.74,.168,.17,-.012),(.81,.152,.158,-.005),(.866,.115,.125,0),(.91,.057,.060,0)]
    hr=[M.ring((0,y,z),rx,ry,24,{'Head':1}) for z,rx,ry,y in head]
    for a,b in zip(hr,hr[1:]):M.bridge(a,b,'head')
    M.cap(hr[0],'head');M.cap(hr[-1],'head')
    # A convex, authored face avoids projecting through missing source triangles.
    # Flatten the frontal arc gently to keep the painted eyes from wrapping around the cheeks.
    for ring in hr:
        for vi in ring:
            p=M.v[vi]
            if p.y<-.06 and .56<p.z<.80:
                depth=.158 if body=='mio' else .164
                edge=max(0,min(1,(abs(p.x)-.085)/.09))
                target=-depth+edge*edge*.055
                p.y=min(p.y,target)
    for sx in [-1,1]:
        ear=M.tube([Vector((sx*.151,.016,.642)),Vector((sx*.168,.012,.645)),Vector((sx*.183,.018,.650))],[ (.020,.030),(.016,.025),(.005,.013)],lambda p:{'Head':1},n=10)
    skin=C.flat_material('astra-skin',C.hex_rgba(SKIN[body]))
    ob=M.object(body+'-body',H,arm,body,{'skin':skin,'head':skin},False)
    # Smooth face only: the body's deliberate broad planes remain visible under matte lighting.
    for p,tag in zip(ob.data.polygons,M.tags):p.use_smooth=tag=='head'
    return ob,M,J
