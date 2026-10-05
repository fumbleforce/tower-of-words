"""Top-down layout drawings for the head office lobby rebuild (review lobby-plan-1, plan notes/lobby-plan.md).
Units are the game's (u east along the tower's south face from its south-west corner, n north), from
game3d/js/scenes/head-office/frame.js: the tower is 16.4 x 9.6, its bay lines every 16.4/11 in u and 9.6/6 in n.
  python3 art/candidates/lobby-plan-1/plan_svg.py   -> plan-a.svg, plan-b.svg, plan-c.svg here (+ .webp via rsvg)
"""
import os, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
W, D = 16.4, 9.6
BU = [W * i / 11 for i in range(12)]
BN = [D * i / 6 for i in range(7)]
S = 56                      # px per unit
M = 70                      # margin
TOP = 100                   # room for the title
COURT = 2.2                 # court strip drawn south of the tower
FONT = 'font-family="Inter, Helvetica, Arial, sans-serif"'
C = dict(bg='#f4f5f2', court='#d9dbd6', marble='#f7f4ec', granite='#6b7280', ink='#1f2933', grid='#c9ccd2',
         glass='#4aa3b8', wood='#c9a27a', stone='#b9b4aa', steel='#8d97a3', seat='#5b7290', green='#6f9a6a',
         office='#e3e6ea', guide='#d9b84a', old='#d0455c', service='#cfd2d6', teal='#1d7f8c')


def X(u): return M + u * S
def Y(n): return TOP + (D - n) * S


class Svg:
    def __init__(self, title, sub):
        self.w, self.h = int(2 * M + W * S + 330), int(TOP + M + (D + COURT) * S + 40)
        self.o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" '
                  f'viewBox="0 0 {self.w} {self.h}">', f'<rect width="100%" height="100%" fill="{C["bg"]}"/>',
                  f'<text x="{M}" y="34" {FONT} font-size="22" font-weight="700" fill="{C["ink"]}">{title}</text>',
                  f'<text x="{M}" y="56" {FONT} font-size="14" fill="#52606d">{sub}</text>']
        self.legend = []

    def rect(self, u0, n0, u1, n1, fill, stroke='none', sw=1, op=1, dash=None, rx=0):
        d = f' stroke-dasharray="{dash}"' if dash else ''
        self.o.append(f'<rect x="{X(u0):.1f}" y="{Y(n1):.1f}" width="{(u1 - u0) * S:.1f}" height="{(n1 - n0) * S:.1f}" '
                      f'rx="{rx}" fill="{fill}" fill-opacity="{op}" stroke="{stroke}" stroke-width="{sw}"{d}/>')

    def circle(self, u, n, r, fill, stroke='none', sw=1):
        self.o.append(f'<circle cx="{X(u):.1f}" cy="{Y(n):.1f}" r="{r * S:.1f}" fill="{fill}" stroke="{stroke}" '
                      f'stroke-width="{sw}"/>')

    def line(self, u0, n0, u1, n1, col, sw=1, dash=None):
        d = f' stroke-dasharray="{dash}"' if dash else ''
        self.o.append(f'<line x1="{X(u0):.1f}" y1="{Y(n0):.1f}" x2="{X(u1):.1f}" y2="{Y(n1):.1f}" stroke="{col}" '
                      f'stroke-width="{sw}"{d}/>')

    def text(self, u, n, s, size=13, col=None, weight=500, anchor='middle'):
        self.o.append(f'<text x="{X(u):.1f}" y="{Y(n) + size / 3:.1f}" {FONT} font-size="{size}" font-weight="{weight}" '
                      f'text-anchor="{anchor}" fill="{col or C["ink"]}">{s}</text>')

    def mark(self, u, n, k, col=None):
        col = col or C['teal']
        self.circle(u, n, 0.2, col)
        self.text(u, n - 0.02, k, 12, '#fff', 700)

    def save(self, name, legend):
        lx = X(W) + 40
        y = TOP
        self.o.append(f'<text x="{lx}" y="{y}" {FONT} font-size="15" font-weight="700" fill="{C["ink"]}">Key</text>')
        for k, s in legend:
            y += 24
            if k.startswith('#'):
                self.o.append(f'<rect x="{lx}" y="{y - 12}" width="18" height="14" fill="{k}" stroke="#555" '
                              f'stroke-width="0.5"/>')
            else:
                self.o.append(f'<circle cx="{lx + 9}" cy="{y - 5}" r="10" fill="{C["teal"]}"/>'
                              f'<text x="{lx + 9}" y="{y - 1}" {FONT} font-size="11" font-weight="700" fill="#fff" '
                              f'text-anchor="middle">{k}</text>')
            self.o.append(f'<text x="{lx + 28}" y="{y}" {FONT} font-size="13" fill="{C["ink"]}">{s}</text>')
        self.o.append('</svg>')
        p = f'{HERE}/{name}.svg'
        open(p, 'w').write('\n'.join(self.o))
        png = f'/tmp/{name}-{os.getpid()}.png'
        subprocess.run(['rsvg-convert', '-z', '1.5', '-o', png, p], check=True)
        subprocess.run(['magick', png, '-quality', '92', f'{HERE}/{name}.webp'], check=True)
        os.remove(png)


def base(s, lobby_u1=BU[9]):
    # court strip, tower, grid
    s.rect(-0.6, -COURT, W + 0.6, 0, C['court'])
    s.text(W / 2, -COURT + 0.35, 'the court (pale granite); its grounds get the same look next', 13, '#52606d')
    s.rect(0, 0, W, D, C['service'], C['ink'], 2)
    s.rect(0, 0, lobby_u1, D, C['marble'])
    for u in BU:
        s.line(u, 0, u, D, C['grid'], 1, '3 4')
        s.text(u, -COURT - 0.3, f'{u:.2f}', 10, '#7b8794')
    for n in BN:
        s.line(0, n, W, n, C['grid'], 1, '3 4')
        s.text(-0.5, n, f'{n:.1f}', 10, '#7b8794')
    s.text(W + 0.25, -COURT - 0.3, 'u', 11, '#7b8794', 700, 'start')
    s.text(-0.5, D + 0.3, 'n', 11, '#7b8794', 700)
    # back office east of the atrium, behind a glass partition, desks in rows (the facts doc's back office)
    s.rect(lobby_u1, 0, W, D, C['office'])
    for i, n in enumerate([1.6, 4.0, 6.4]):
        s.rect(lobby_u1 + 0.5, n, W - 0.5, n + 0.7, '#c4cad1')
    s.text((lobby_u1 + W) / 2, 8.6, 'back office', 13, '#52606d')
    s.line(lobby_u1, 0, lobby_u1, D, C['glass'], 4)
    # glass frontage: south face of the atrium, west face
    s.line(0, 0, lobby_u1, 0, C['glass'], 6)
    s.line(0, 0, 0, 7.2, C['glass'], 6)
    # today's lobby, for scale
    s.rect(0, 0, 9.9, 6.2, 'none', C['old'], 2, dash='8 5')
    s.text(9.75, 0.3, 'today 9.9 x 6.2', 12, C['old'], 600, 'end')


def entrance(s):
    s.rect(2.4, -0.25, 4.0, 0.25, C['bg'], C['ink'], 1.5)
    s.text(4.2, -0.5, 'entrance (door stays at u 3.2)', 12, C['ink'], 600, 'start')
    s.rect(2.45, 0.25, 3.95, 1.05, '#3c4658')   # mat
    s.rect(2.4, -1.6, 4.0, -0.3, '#9aa1aa', op=0.6)  # canopy footprint
    s.text(4.1, -1.0, 'canopy', 11, '#52606d', anchor='start')


def walk(s, pts, w=1.5):
    for (u0, n0), (u1, n1) in zip(pts, pts[1:]):
        s.rect(min(u0, u1) - w / 2, min(n0, n1) - w / 2, max(u0, u1) + w / 2, max(n0, n1) + w / 2, C['granite'], op=0.9)


def lifts(s, u0, u1, n0, labels):
    s.rect(u0, n0, u1, D, '#5d636c')
    k = len(labels)
    w = (u1 - u0) / k
    for i, lab in enumerate(labels):
        c = u0 + w * (i + 0.5)
        s.rect(c - 0.55, n0 - 0.05, c + 0.55, n0 + 0.12, C['steel'])
        s.text(c, n0 + 0.9, lab, 11, '#fff', 600)


def desk(s, uc, n, length=4.6, wall=True):
    s.rect(uc - length / 2, n - 0.35, uc + length / 2, n + 0.35, C['wood'], C['ink'], 1, rx=4)
    s.text(uc, n, 'reception desk (light oak, stone front)', 11, C['ink'], 600)
    s.circle(uc, n + 0.75, 0.22, '#2a2f38')
    s.text(uc + 0.35, n + 0.75, 'Kuro', 11, C['ink'], 700, 'start')
    s.rect(uc - 0.3, n - 1.1, uc + 0.3, n - 0.5, C['guide'])


def island(s, u, n):
    s.circle(u, n, 0.95, C['seat'])
    s.circle(u, n, 0.62, C['marble'])
    s.circle(u, n, 0.5, C['stone'])
    s.circle(u, n, 0.38, C['green'])


def plant(s, u, n, r=0.3):
    s.circle(u, n, r, C['green'], '#3e6b3b', 1)


LEG_COMMON = [(C['marble'], 'pale marble floor on the bay grid'), (C['granite'], 'dark granite walks (court walk carried in)'),
              (C['guide'], 'yellow guide line, door to the visitor spot'), (C['wood'], 'light oak desk'),
              (C['stone'], 'stone feature wall / planters'), (C['seat'], 'seating islands'),
              ('#5d636c', 'lift core'), (C['glass'], 'glass frontage and partition'), (C['service'], 'stairs, service'),
              (C['old'], 'today\'s lobby outline (dashed)')]


def plan_a():
    s = Svg('Lobby plan A (default): desk ahead of the door, lift bank to its right',
            'Double-height atrium u 0-13.42 x n 0-9.6 (9 x 6 bays). Grid: the facade bay lines, 1.49 x 1.6. '
            'North is up; the camera looks north.')
    base(s)
    entrance(s)
    # service and stairs behind the feature wall, west of the core
    s.rect(0, 7.4, BU[5], D, C['service'])
    s.rect(BU[4], 7.4, BU[5], D, '#b8bcc2')
    s.text((BU[4] + BU[5]) / 2, 8.5, 'stairs', 11)
    s.rect(BU[4] + 0.25, 7.3, BU[5] - 0.25, 7.45, '#2f3440')
    s.text(2.6, 8.5, 'service, riser', 11, '#52606d')
    s.rect(0.2, 7.15, BU[4], 7.4, C['stone'])
    s.text(2.95, 7.0, 'feature wall: AMAKAWA, 受付 RECEPTION', 11, C['ink'], 600)
    # walks: door north to the visitor spot, cross walk east on n 3.2, north to the lift apron
    walk(s, [(3.2, 0.2), (3.2, 4.5)], 1.6)
    walk(s, [(3.2, 3.2), (BU[7], 3.2), (BU[7], 5.6)], 1.5)
    s.rect(BU[5], 5.6, BU[9], 7.6, C['granite'], op=0.75)
    s.text(BU[8] + 0.75, 6.2, 'lift apron', 11, '#fff', 600)
    s.rect(3.05, 1.05, 3.35, 4.7, C['guide'])
    lifts(s, BU[5], BU[9], 7.6, ['B2-5F', '6F-12F', '6F-12F', 'B1-5F'])
    desk(s, 3.2, 5.6)
    for u, n in [(BU[5] + 0.45, 5.15), (BU[9] - 0.45, 5.15), (0.5, 6.6), (5.75, 6.6), (0.6, 0.6)]:
        plant(s, u, n)
    island(s, BU[4] + 0.3, 1.4)
    island(s, BU[8] - 0.2, 1.4)
    s.rect(BU[5] + 0.9, 4.55, BU[6] + 0.5, 4.95, C['seat'])
    s.rect(0.5, 1.6, 1.7, 2.6, '#e7edf2', C['glass'], 2)
    s.text(1.1, 2.1, 'model', 10, C['teal'], 700)
    s.rect(4.6, 0.4, 4.85, 0.65, '#7d848e')
    for k, u, n in [('1', 3.2, 3.2), ('2', BU[7], 3.2), ('3', BU[7], 5.6)]:
        s.mark(u, n, k)
    s.mark(3.2, 4.8, 'V', '#b0802a')
    s.mark(BU[5] + 0.75, 6.75, 'L', '#b0802a')
    s.save('plan-a', [('1', 'junction: door walk meets cross walk'), ('2', 'junction: turn north to the lifts'),
                      ('3', 'lift apron entry'), ('V', 'visitor spot (receptionFront), talk to Kuro'),
                      ('L', 'liftOut: B2 car, west end of the bank')] + LEG_COMMON +
           [('#e7edf2', 'nook: island model under glass')])


def plan_b():
    s = Svg('Lobby plan B: lift bank straight ahead of the door, desk to the right',
            'Same atrium and grid. The B2 car stays on the door line (u 3.2); the desk and its wall sit in the '
            'east half.')
    base(s)
    entrance(s)
    walk(s, [(3.2, 0.2), (3.2, 5.6)], 1.6)
    walk(s, [(3.2, 3.2), (BU[7], 3.2), (BU[7], 4.2)], 1.5)
    s.rect(0.2, 5.6, BU[4] + 0.2, 7.6, C['granite'], op=0.75)
    lifts(s, 0.2, BU[4] + 0.2, 7.6, ['6F-12F', 'B2-5F', '6F-12F'])
    s.rect(BU[4] + 0.2, 7.6, BU[5] + 0.2, D, '#b8bcc2')
    s.text((BU[4] + BU[5]) / 2 + 0.2, 8.5, 'stairs', 11)
    s.rect(BU[5] + 0.2, 7.15, BU[9] - 0.2, 7.4, C['stone'])
    s.rect(BU[5] + 0.2, 7.4, BU[9], D, C['service'])
    s.text(BU[7], 7.0, 'feature wall: AMAKAWA, 受付 RECEPTION', 11, C['ink'], 600)
    desk(s, BU[7] - 0.2 + 0.2, 5.6 - 0.0)
    s.rect(BU[7] - 0.15, 3.05, BU[7] + 0.15, 4.6, C['guide'])
    s.rect(3.05, 1.05, 3.35, 3.35, C['guide'])
    s.rect(3.2, 3.05, BU[7] + 0.15, 3.35, C['guide'])
    island(s, BU[6], 1.4)
    island(s, BU[8] + 0.2, 1.4)
    for u, n in [(0.5, 5.2), (BU[4] - 0.1, 5.2), (BU[9] - 0.5, 6.6), (BU[5] + 0.6, 6.6)]:
        plant(s, u, n)
    s.mark(3.2, 3.2, '1')
    s.mark(BU[7], 3.2, '2')
    s.mark(BU[7], 4.8, 'V', '#b0802a')
    s.mark(3.2, 6.75, 'L', '#b0802a')
    s.save('plan-b', [('1', 'junction: cross walk to the desk'), ('2', 'turn north to the visitor spot'), ('V', 'visitor spot'),
                      ('L', 'liftOut: B2 car on the door line')] + LEG_COMMON)


def plan_c():
    s = Svg('Lobby plan C: free-standing desk on the door line, lift bank right behind it',
            'Same atrium and grid. AMAKAWA goes on the stone wall over the lift doors; the walk passes the desk\'s '
            'east end.')
    base(s)
    entrance(s)
    walk(s, [(3.2, 0.2), (3.2, 2.9)], 1.6)
    walk(s, [(3.2, 2.4), (BU[4] + 0.6, 2.4), (BU[4] + 0.6, 5.8)], 1.4)
    s.rect(0.2, 5.8, BU[5] + 0.2, 7.6, C['granite'], op=0.75)
    lifts(s, 0.2, BU[5] + 0.2, 7.6, ['6F-12F', 'B2-5F', 'B1-5F', '6F-12F'])
    s.text(3.8, 7.35, 'AMAKAWA over the lift doors', 11, C['ink'], 600)
    s.rect(BU[5] + 0.2, 7.6, BU[6] + 0.2, D, '#b8bcc2')
    s.text((BU[5] + BU[6]) / 2 + 0.2, 8.5, 'stairs', 11)
    s.rect(BU[6] + 0.2, 7.6, BU[9], D, C['service'])
    desk(s, 3.2, 4.2, 3.6)
    s.rect(3.05, 1.05, 3.35, 3.15, C['guide'])
    island(s, BU[6] + 0.4, 1.6)
    island(s, BU[8] - 0.2, 4.6)
    s.rect(BU[6], 5.6, BU[8], 6.6, C['seat'], op=0.5)
    s.text(BU[7], 6.1, 'lounge', 11, C['ink'], 600)
    for u, n in [(0.5, 3.0), (BU[9] - 0.5, 6.9), (0.5, 0.6)]:
        plant(s, u, n)
    s.mark(3.2, 2.4, '1')
    s.mark(BU[4] + 0.6, 2.4, '2')
    s.mark(3.2, 3.4, 'V', '#b0802a')
    s.mark(0.2 + 1.5 * (BU[5] / 4), 6.75, 'L', '#b0802a')
    s.save('plan-c', [('1', 'junction: walk steps east round the desk'), ('2', 'turn north past the desk\'s end'),
                      ('V', 'visitor spot'), ('L', 'liftOut: B2 car behind the desk')] + LEG_COMMON)


if __name__ == '__main__':
    plan_a(); plan_b(); plan_c()
    print('ok')
