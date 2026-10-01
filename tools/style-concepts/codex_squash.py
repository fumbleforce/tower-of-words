"""Squashy cartoon characters: narrow shaped heads, pear torsos, broad mitts and long shoes."""
from codex_forms import Model

HEAD={}
HEAD_SPAN=.47
MOTION=dict(swing=28,arm_swing=27,arm_out=6)


def build(ch,coll):
    m=Model(ch,coll,'squash')
    eric=ch=='eric'
    hip,neck=.41,.85 if eric else .80
    for s,side in ((1,'L'),(-1,'R')):
        m.bone='leg.'+side
        m.ball('soft trouser leg','trouser',(s*.115,.005,.28),(.15,.16,.35))
        m.ball('big sneaker','shoe',(s*.125,-.082,.083),(.225,.36,.165))
        m.box('rubber sole','#d9dfdc' if not eric else '#687381',(s*.125,-.071,.032),(.222,.32,.049),.28)
        for z in (-.09,-.065,-.04):
            m.line('lace','#b0bcbc' if not eric else '#85909a',[(s*.125-.043,z,.15),(s*.125+.043,z,.15)],.003)
    m.bone='torso'
    m.rings('pear jacket','coat',[(.36,.10,.08,.03),(.40,.20,.14,.02),(.49,.24,.175,.01),(.62,.23,.165,0),
            (neck-.10,.16,.115,0),(neck,.09,.07,0)],segs=32)
    m.detail(neck,.163,.23)
    if not eric:
        m.ball('pocket','inner',(0,-.157,.485),(.26,.057,.14))
    for s,side in ((1,'L'),(-1,'R')):
        m.bone='arm.'+side
        m.ball('swept sleeve','coat',(s*.238,-.008,neck-.19),(.15,.16,.34),rot=(0,-s*17,0))
        m.ball('cuff','inner',(s*.283,-.012,neck-.33),(.14,.145,.065))
        m.ball('large expressive hand','skin',(s*.301,-.015,neck-.404),(.158,.146,.171),rot=(0,s*10,0))
        m.ball('thumb','skin',(s*.237,-.07,neck-.38),(.072,.082,.095))
        for i in (-1,1):
            m.line('finger crease','#c5a68e',[(s*.30+i*.025,-.082,neck-.428),
                   (s*.30+i*.025,-.083,neck-.45)],.002)
    m.bone='head'
    hz=neck+.19
    # Width moves toward the cheek line and drops sharply to the chin: a shaped bean, not a sphere.
    m.rings('bean shaped face','skin',[(hz-.19,.050,.063,-.008),(hz-.157,.108,.095,-.019),
            (hz-.08,.151,.114,-.021),(hz+.045,.141,.116,0),
            (hz+.133,.125,.105,.013),(hz+.18,.08,.076,.02),
            (hz+.19,.016,.02,.02)],segs=32)
    for s in (-1,1):
        m.ball('ear','skin',(s*.15,.002,hz-.015),(.072,.075,.104))
        m.ball('eye white','#eee9de',(s*.061,-.113,hz+.005),(.080,.027,.052))
        m.ball('iris','eye',(s*.06,-.133,hz+.001),(.031,.016,.042))
        m.ball('pupil','#223236',(s*.060,-.143,hz+.001),(.012,.009,.030))
        m.line('top eyelid','hair',[(s*.098,-.118,hz+.026),(s*.061,-.136,hz+.024),
                   (s*.025,-.126,hz+.025)],.004)
        m.line('brow','hair',[(s*.10,-.107,hz+.069),(s*.04,-.123,hz+.075)],.008)
    m.glasses(hz+.013,-.151,.282,.085)
    m.ball('cartoon nose','skin',(.003,-.149,hz-.055),(.075 if eric else .055,.080,.061))
    m.line('quiet smile','#98796b',[(-.034,-.126,hz-.108),(.005,-.132,hz-.113),(.038,-.12,hz-.102)],.003)
    m.ball('hair back','hair',(0,.056,hz+.029),(.32,.245,.35))
    m.ball('crown','hair',(0,.004,hz+.16),(.303,.225,.126))
    if eric:
        for i in range(5):
            x=(i-2)*.053
            m.line('swept hair','hair' if i%2 else '#afa07f',[(x,-.089,hz+.115),(x-.02,-.065,hz+.17),
                   (x-.025,.015,hz+.185+abs(i-2)*.004),(x-.01,.13,hz+.146)],.035,tip=.35)
        m.ball('short tail','hair',(0,.216,hz-.050),(.18,.17,.16),rot=(15,0,0))
        m.line('blue hair tie','accent',[(-.069,.159,hz-.015),(0,.174,hz-.05),(.069,.159,hz-.015)],.009)
        for i in range(16):
            x=(i%8-3.5)*.029; z=hz-.125-(i//8)*.014
            m.line('stubble','#968875',[(x,-.111,z),(x+.003,-.112,z+.006)],.002)
    else:
        m.ball('green underside','accent',(.12,.069,hz-.075),(.10,.18,.20))
        for x,z in ((-.10,hz+.064),(-.036,hz+.091),(.03,hz+.115)):
            m.line('sweeping fringe','hair',[(x+.02,.004,hz+.188),(x-.02,-.08,hz+.158),(x-.015,-.12,z)],.031,tip=.18)
        m.line('long right lock','hair',[(-.13,.018,hz+.091),(-.17,-.04,hz-.01),(-.173,-.06,hz-.18)],.022,tip=.28)
        m.ball('loose bun','hair',(.105,.175,hz+.127),(.19,.18,.16))
        m.line('green bun coil','accent',[(.04,.22,hz+.13),(.10,.263,hz+.14),(.17,.22,hz+.12)],.015)
    HEAD[ch]=(0,0,hz)
    return m.rig(hip,neck,.19,.28,.115)
