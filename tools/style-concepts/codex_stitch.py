"""Sewn cloth dolls: pear-shaped hoodie, broad cloth face, padded limbs and visible seams."""
import math
from codex_forms import Model
from mathutils import Vector

HEAD={}
HEAD_SPAN=.48
MOTION=dict(swing=23,arm_swing=18,arm_out=3)


def build(ch,coll):
    m=Model(ch,coll,'stitch')
    eric=ch=='eric'
    hip,neck=.37,.79 if eric else .75
    for s,side in ((1,'L'),(-1,'R')):
        m.bone='leg.'+side
        m.box('stuffed trouser leg','trouser',(s*.105,0,.245),(.17,.185,.29),.30)
        m.box('cloth shoe','shoe',(s*.105,-.035,.069),(.20,.29,.135),.32)
        m.line('shoe seam','#768388',[(s*.105-.07,-.157,.067),(s*.105,-.174,.056),(s*.105+.07,-.157,.067)],.004)
    m.bone='torso'
    m.rings('pear shaped stuffed jacket','coat',[(.32,.12,.09,0),(.35,.21,.145,0),(.47,.235,.16,0),
            (.63,.19,.14,0),(neck-.04,.145,.105,0),(neck,.10,.08,0)],segs=28)
    m.detail(neck,.148,.22)
    if not eric:
        m.box('kangaroo pocket','inner',(0,-.151,.46),(.23,.034,.13),.23)
        for s in (-1,1):
            m.line('pocket opening','coat',[(s*.10,-.172,.51),(s*.071,-.175,.46)],.005)
    for x in (-.15,-.10,-.05,0,.05,.10,.15):
        m.line('jacket hem stitch','#648582' if not eric else '#66778b',[(x-.009,-.14,.359),(x+.009,-.14,.367)],.0027)
    for s,side in ((1,'L'),(-1,'R')):
        m.bone='arm.'+side
        m.ball('stuffed sleeve','coat',(s*.229,0,neck-.19),(.18,.19,.32),rot=(0,s*-12,0))
        m.box('rib cuff','inner',(s*.263,-.01,neck-.315),(.143,.145,.065),.2)
        m.ball('mitten hand','skin',(s*.27,-.01,neck-.382),(.135,.135,.13))
        m.ball('thumb','skin',(s*.224,-.049,neck-.358),(.06,.07,.07))
        for z in (neck-.15,neck-.18,neck-.21,neck-.24):
            m.line('sleeve stitch','#4f7778' if not eric else '#526278',[(s*.308,-.04,z),(s*.316,-.006,z-.008)],.0028)
    m.bone='head'
    hz=neck+.185
    face=m.box('stuffed cloth face','skin',(0,-.004,hz),(.365,.275,.35),.29)
    # A continuous inset seam makes the cloth panel readable; stitches follow its real surface.
    def seam_point(a, scale=1):
        x=.162*math.cos(a)*scale; z=hz+.143*math.sin(a)*scale
        hit,loc,normal,_=face.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
        return tuple(loc+normal*.0018) if hit else (x,-.10,z)
    seam=[seam_point(i*2*math.pi/80) for i in range(80)]
    m.line('face panel seam','#d2bba2',seam,.0016,True)
    for i in range(24):
        a=2*math.pi*i/24
        if math.sin(a)>.72: continue
        m.line('face hem','#dbc4ac',[seam_point(a,.977),seam_point(a,1.012)],.002)
    for s in (-1,1):
        m.ball('cloth ear','skin',(s*.179,0,hz-.01),(.06,.07,.09))
        m.ball('embroidered eye','eye',(s*.070,-.146,hz+.002),(.039,.012,.049))
        m.ball('thread pupil','#283336',(s*.069,-.154,hz+.002),(.014,.006,.032))
        m.line('eyebrow','hair',[(s*.103,-.151,hz+.069),(s*.049,-.156,hz+.075)],.006)
    m.glasses(hz+.009,-.163,.293,.090)
    m.ball('small sewn nose','skin',(0,-.154,hz-.045),(.039,.028,.03))
    m.line('stitched mouth','#987875',[(-.023,-.147,hz-.087),(0,-.151,hz-.091),(.023,-.147,hz-.086)],.003)
    # Back hair has depth, separate lobes round the head, plus flat-ended cloth locks.
    m.ball('hair back','hair',(0,.050,hz+.025),(.395,.24,.35))
    m.ball('cloth hair crown','hair',(0,.009,hz+.151),(.38,.276,.155)) if eric else m.box('cloth fringe crown','hair',(0,-.004,hz+.151),(.38,.276,.109),.30)
    if eric:
        for s in (-1,1):
            m.box('side hair','hair',(s*.165,.017,hz+.065),(.060,.19,.20),.22)
        for i in range(5):
            x=(i-2)*.05
            points=[]
            for y in (-.085,-.04,.01,.06,.105):
                z=hz+.151+.0775*math.sqrt(max(0,1-(x/.19)**2-((y-.009)/.138)**2))+.002
                points.append((x,y,z))
            m.line('combed cloth seam','#b6a788',points,.0035)
        m.ball('ponytail','hair',(0,.213,hz-.048),(.17,.15,.20))
        m.line('blue tie','accent',[(-.071,.155,hz-.028),(0,.172,hz-.065),(.071,.155,hz-.028)],.009)
        for i in range(15):
            x=(i%5-2)*.043; z=hz-.09-(i//5)*.018
            m.line('stubble stitch','#9b8977',[(x,-.141,z),(x+.005,-.142,z+.009)],.0019)
    else:
        m.box('teal lining','accent',(.135,.086,hz-.08),(.095,.19,.21),.26)
        for i,(x,z) in enumerate(((-.13,hz+.07),(-.061,hz+.10),(.015,hz+.12))):
            m.prism('cloth fringe','hair',[(x-.055,hz+.18),(x+.052,hz+.17),(x+.034,z-.025),(x-.024,z)],-.139,.026,.012)
        m.box('long right lock','hair',(-.18,-.044,hz-.06),(.057,.12,.29),.20,rot=(0,-8,0))
        m.ball('tied cloth bun','hair',(.11,.175,hz+.12),(.21,.19,.18))
        m.line('bun green seam','accent',[(.06,.246,hz+.11),(.12,.257,hz+.14),(.17,.23,hz+.15)],.008)
    HEAD[ch]=(0,0,hz)
    return m.rig(hip,neck,.19,.26,.105)
