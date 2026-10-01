"""Compact carved figures: short barrel bodies, angular shaped faces and chisel-cut hair."""
from codex_forms import Model
import kit

HEAD={}
HEAD_SPAN=.49
MOTION=dict(swing=22,arm_swing=17,arm_out=2)


def build(ch,coll):
    m=Model(ch,coll,'carved')
    eric=ch=='eric'
    hip,neck=.29,.74 if eric else .70
    for s,side in ((1,'L'),(-1,'R')):
        m.bone='leg.'+side
        m.box('short carved leg','trouser',(s*.10,.0,.20),(.14,.15,.24),.05)
        m.prism('wedge shoe','shoe',[(s*.10-.085,.025),(s*.10+.085,.025),(s*.10+.075,.12),(s*.10-.072,.14)],-.045,.24,.012)
    m.bone='torso'
    m.rings('carved barrel jacket','coat',[(.27,.13,.10,0),(.32,.20,.15,0),(.51,.215,.16,0),
            (neck-.08,.17,.13,0),(neck,.095,.08,0)],segs=10,smooth=None)
    m.detail(neck,.151,.205)
    if not eric:
        m.prism('pocket','inner',[(-.115,.36),(.115,.36),(.10,.46),(-.10,.46)],-.156,.012,.004)
    for s,side in ((1,'L'),(-1,'R')):
        m.bone='arm.'+side
        m.prism('tapered sleeve','coat',[(s*.16,neck-.05),(s*.255,neck-.085),(s*.29,.37),(s*.20,.355)],.0,.19,.016)
        m.box('cuff','inner',(s*.253,-.005,.375),(.106,.19,.053),.03)
        m.prism('carved hand','skin',[(s*.205,.34),(s*.291,.345),(s*.307,.255),(s*.267,.223),(s*.208,.25)],-.018,.12,.012)
    m.bone='head'
    hz=neck+.19
    outline=[(-.155,hz+.12),(-.102,hz+.18),(.1,hz+.18),(.166,hz+.09),(.15,hz-.105),
             (.045,hz-.19),(-.05,hz-.19),(-.148,hz-.107)]
    # Two depth transitions across cheeks and chin give the mask a carved surface.
    front=[(x,-.097 if z>hz-.13 else -.065,z) for x,z in outline]
    inset=[(x*.66,-.148 if z>hz-.13 else -.12,hz+(z-hz)*.64) for x,z in outline]
    back=[(x,.117,z) for x,z in outline]
    vs=front+inset+back
    fs=[tuple(range(8,16)),tuple(reversed(range(16,24)))]
    for i in range(8):
        j=(i+1)%8
        fs.extend([(i,j,j+8,i+8),(i,i+16,j+16,j)])
    m.add(kit.mesh('carved cheek and jaw',vs,fs,'',m=m.mat('skin'),coll=coll))
    for s in (-1,1):
        m.prism('ear','skin',[(s*.15,hz+.012),(s*.20,hz+.025),(s*.204,hz-.05),(s*.154,hz-.079)],0,.09,.006)
        m.box('carved eye','eye',(s*.065,-.158,hz+.005),(.034,.010,.027),.02)
        m.box('pupil','#223135',(s*.067,-.168,hz+.005),(.011,.009,.023),.01)
        m.line('brow','hair',[(s*.107,-.139,hz+.067),(s*.048,-.157,hz+.078)],.005)
    m.glasses(hz+.012,-.181,.272,.08,False)
    m.prism('nose wedge','skin',[(-.018,hz-.014),(.024,hz-.064),(-.025,hz-.064)],-.174,.062,.004)
    m.line('mouth cut','#9b7466',[(-.027,-.145,hz-.10),(.026,-.144,hz-.102)],.003)
    m.prism('solid hair back','hair',[(-.17,hz+.11),(-.115,hz+.205),(.095,hz+.212),(.18,hz+.115),(.16,hz-.09),
            (-.14,hz-.10)],.068,.22,.01)
    if eric:
        for i in range(5):
            x=(i-2)*.055
            m.prism('swept carved crest','hair' if i%2 else '#b1a080',[(x-.045,hz+.115),(x+.036,hz+.13),
                 (x+.015,hz+.235),(x-.038,hz+.21)],-.025,.19,.007)
        m.prism('short tied tail','hair',[(-.06,hz+.025),(.065,hz+.02),(.09,hz-.14),(.015,hz-.19),(-.07,hz-.1)],.235,.11,.005)
        m.box('hair tie','accent',(0,.205,hz-.025),(.139,.035,.025),.01)
        for i in range(14):
            x=(i%7-3)*.032; z=hz-.13-(i//7)*.018
            m.line('stubble cut','#968471',[(x,-.140,z),(x+.005,-.140,z+.01)],.0018)
    else:
        side=[(-.05,hz+.09),(.125,hz+.09),(.10,hz-.14),(.02,hz-.11)]
        vs=[(x,y,z) for x in (.115,.18) for y,z in side]
        fs=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
        m.add(kit.mesh('tapered green undercut',vs,fs,'',m=m.mat('accent'),coll=coll))
        for x,z in ((-.12,hz+.055),(-.058,hz+.09),(.01,hz+.108)):
            m.prism('chisel fringe','hair',[(x-.042,hz+.176),(x+.055,hz+.189),(x+.034,z),(x-.025,z-.018)],-.145,.035,.006)
        m.prism('long right lock','hair',[(-.18,hz+.1),(-.14,hz+.065),(-.14,hz-.19),(-.19,hz-.22)],-.065,.11,.006)
        m.rings('carved bun','hair',[(hz+.10,.07,.065,.18),(hz+.13,.13,.10,.19),(hz+.22,.095,.08,.19),
                (hz+.26,.035,.035,.19)],segs=7,smooth=None)
    HEAD[ch]=(0,0,hz)
    return m.rig(hip,neck,.19,.25,.10)
