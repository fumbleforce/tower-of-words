"""Draw the dorm building plans (ground floor, 2F open-air, 2F interior) as SVG.

Coordinates are the dorm courtyard's own frame (game3d/js/scenes/dorm-court/plan.js): x to the right on screen
(island south), z toward the camera (island west). Up in the drawing is island east, the way the game's camera
looks at the block. 1 unit = about 1.5 m.
"""
import sys

S = 54  # px per unit
X0, X1 = -11.2, 10.2
Z0, Z1 = -10.4, 7.4
TOP = 96
PANEL = 560
W = int((X1 - X0) * S) + PANEL + 40
H = int((Z1 - Z0) * S) + TOP + 30
FONT = "Noto Sans CJK JP"

INK = "#2b3038"
WALL = "#3a3f47"
FLOOR = "#f4f5f6"
BG = "#e9ebee"
GREEN = "#cfdccb"
PAVE = "#e3e1dc"
STREET = "#cfd0d3"
SHADE = "#d6d9de"
ROUTE = "#0f8b8d"
GOAL = "#d64545"
CAM = "#2f4a8a"
ERIC = "#e7f2f2"


def px(x):
    return (x - X0) * S + 20


def pz(z):
    return (z - Z0) * S + TOP


class Svg:
    def __init__(self, title, sub):
        self.o = [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="HEIGHT" font-family="{FONT}">',
            f'<rect width="{W}" height="HEIGHT" fill="#fbfbfa"/>',
            '<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
            '<line x1="0" y1="0" x2="0" y2="8" stroke="#aab0b8" stroke-width="2"/></pattern>'
            '<marker id="arr" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">'
            f'<path d="M0,0 L10,5 L0,10 z" fill="{ROUTE}"/></marker></defs>',
            f'<text x="20" y="40" font-size="28" font-weight="700" fill="{INK}">{title}</text>',
            f'<text x="20" y="72" font-size="17" fill="#5a616b">{sub}</text>',
        ]
        # plan area frame
        self.o.append(
            f'<rect x="{px(X0)}" y="{pz(Z0)}" width="{(X1-X0)*S}" height="{(Z1-Z0)*S}" fill="{BG}" stroke="#c5c9cf"/>'
        )
        self.o.append(f'<clipPath id="plan"><rect x="{px(X0)}" y="{pz(Z0)}" width="{(X1-X0)*S}" height="{(Z1-Z0)*S}"/></clipPath>')
        self.o.append('<g clip-path="url(#plan)">')
        self.clipped = True

    def unclip(self):
        if self.clipped:
            self.o.append("</g>")
            self.clipped = False

    def rect(self, x0, x1, z0, z1, fill="none", stroke="none", sw=1, dash=None, op=1):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.o.append(
            f'<rect x="{px(min(x0,x1)):.1f}" y="{pz(min(z0,z1)):.1f}" width="{abs(x1-x0)*S:.1f}" height="{abs(z1-z0)*S:.1f}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d} opacity="{op}"/>'
        )

    def line(self, x0, z0, x1, z1, stroke=WALL, sw=4, dash=None, cap="butt"):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.o.append(
            f'<line x1="{px(x0):.1f}" y1="{pz(z0):.1f}" x2="{px(x1):.1f}" y2="{pz(z1):.1f}" stroke="{stroke}" '
            f'stroke-width="{sw}" stroke-linecap="{cap}"{d}/>'
        )

    def wallx(self, x0, x1, z, gaps=(), sw=5):
        """a wall along x at z, with door gaps [(a, b)]"""
        pts = [x0]
        for a, b in sorted(gaps):
            pts += [a, b]
        pts.append(x1)
        for i in range(0, len(pts), 2):
            if pts[i + 1] > pts[i]:
                self.line(pts[i], z, pts[i + 1], z, sw=sw, cap="square")

    def wallz(self, z0, z1, x, gaps=(), sw=5):
        pts = [z0]
        for a, b in sorted(gaps):
            pts += [a, b]
        pts.append(z1)
        for i in range(0, len(pts), 2):
            if pts[i + 1] > pts[i]:
                self.line(x, pts[i], x, pts[i + 1], sw=sw, cap="square")

    def text(self, x, z, s, size=15, fill=INK, anchor="middle", weight=400, raw=False):
        X = x if raw else px(x)
        Y = z if raw else pz(z)
        self.o.append(
            f'<text x="{X:.1f}" y="{Y:.1f}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" font-weight="{weight}">{s}</text>'
        )

    def route(self, pts, dash=None, arrow=True):
        d = " ".join(f"{'M' if i == 0 else 'L'}{px(x):.1f},{pz(z):.1f}" for i, (x, z) in enumerate(pts))
        da = f' stroke-dasharray="{dash}"' if dash else ""
        m = ' marker-end="url(#arr)"' if arrow else ""
        self.o.append(
            f'<path d="{d}" fill="none" stroke="{ROUTE}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"{da}{m}/>'
        )

    def goal(self, x, z, n):
        self.o.append(f'<circle cx="{px(x):.1f}" cy="{pz(z):.1f}" r="15" fill="{GOAL}" stroke="white" stroke-width="2.5"/>')
        self.text(x, z, "", 1)
        self.o.append(
            f'<text x="{px(x):.1f}" y="{pz(z)+5.5:.1f}" font-size="15" font-weight="700" fill="white" text-anchor="middle">G{n}</text>'
        )

    def trip(self, x, z, label="T"):
        X, Y = px(x), pz(z)
        self.o.append(
            f'<rect x="{X-15:.1f}" y="{Y-15:.1f}" width="30" height="30" rx="4" fill="{ROUTE}" stroke="white" stroke-width="2.5" transform="rotate(45 {X:.1f} {Y:.1f})"/>'
        )
        self.o.append(f'<text x="{X:.1f}" y="{Y+5.5:.1f}" font-size="14" font-weight="700" fill="white" text-anchor="middle">{label}</text>')

    def cam(self, x, z, n, spread=0.9, reach=2.2, dirz=-1, dirx=0.0):
        """camera icon at (x, z) looking along (dirx, dirz) with a view cone"""
        import math

        a = math.atan2(dirz, dirx)
        l = (x + math.cos(a - spread / 2) * reach, z + math.sin(a - spread / 2) * reach)
        r = (x + math.cos(a + spread / 2) * reach, z + math.sin(a + spread / 2) * reach)
        self.o.append(
            f'<path d="M{px(x):.1f},{pz(z):.1f} L{px(l[0]):.1f},{pz(l[1]):.1f} L{px(r[0]):.1f},{pz(r[1]):.1f} z" '
            f'fill="{CAM}" fill-opacity="0.12" stroke="{CAM}" stroke-opacity="0.6" stroke-width="1.5" stroke-dasharray="5 4"/>'
        )
        X, Y = px(x), pz(z)
        self.o.append(f'<rect x="{X-17:.1f}" y="{Y-12:.1f}" width="34" height="24" rx="5" fill="{CAM}" stroke="white" stroke-width="2"/>')
        self.o.append(f'<text x="{X:.1f}" y="{Y+5.5:.1f}" font-size="14" font-weight="700" fill="white" text-anchor="middle">C{n}</text>')

    def stairs(self, x0, x1, z0, z1, n=8, up_to_z=None):
        self.rect(x0, x1, z0, z1, fill="#e6e8eb")
        for i in range(1, n):
            z = z0 + (z1 - z0) * i / n
            self.line(x0, z, x1, z, stroke="#8d939b", sw=1.5)

    def compass(self):
        # a north arrow for the island frame: island east is up, island north is left
        cx, cy = px(X1) - 70, pz(Z0) + 70
        self.o.append(f'<circle cx="{cx}" cy="{cy}" r="44" fill="white" stroke="#c5c9cf"/>')
        self.o.append(f'<path d="M{cx},{cy-34} L{cx+8},{cy-12} L{cx-8},{cy-12} z" fill="{INK}"/>')
        self.o.append(f'<text x="{cx}" y="{cy+6}" font-size="13" fill="{INK}" text-anchor="middle">E up</text>')
        self.o.append(f'<text x="{cx-30}" y="{cy+24}" font-size="12" fill="#5a616b" text-anchor="middle">N</text>')
        self.o.append(f'<text x="{cx+30}" y="{cy+24}" font-size="12" fill="#5a616b" text-anchor="middle">S</text>')

    def scalebar(self):
        x, z = X0 + 0.6, Z1 - 0.5
        self.line(x, z, x + 2, z, stroke=INK, sw=3)
        for t in (x, x + 1, x + 2):
            self.line(t, z - 0.12, t, z + 0.12, stroke=INK, sw=2)
        self.text(x + 2.2, z + 0.12, "2 units (about 3 m)", 13, anchor="start")

    def panel(self, lines):
        """legend panel on the right: list of (kind, text) rows"""
        self.unclip()
        x = px(X1) + 24
        y = pz(Z0) + 4
        for kind, s in lines:
            if kind == "h":
                y += 12
                self.text(x, y + 16, s, 18, weight=700, raw=True, anchor="start")
                y += 30
            elif kind == "sp":
                y += 10
            elif kind in ("g", "c", "t"):
                n, body = s
                if kind == "g":
                    self.o.append(f'<circle cx="{x+13}" cy="{y+11}" r="12" fill="{GOAL}"/>')
                    self.text(x + 13, y + 16, f"G{n}", 12, fill="white", weight=700, raw=True)
                elif kind == "c":
                    self.o.append(f'<rect x="{x}" y="{y+1}" width="28" height="20" rx="4" fill="{CAM}"/>')
                    self.text(x + 14, y + 16, f"C{n}", 12, fill="white", weight=700, raw=True)
                else:
                    self.o.append(
                        f'<rect x="{x+3}" y="{y+2}" width="18" height="18" rx="3" fill="{ROUTE}" transform="rotate(45 {x+12} {y+11})"/>'
                    )
                    self.text(x + 12, y + 16, n, 11, fill="white", weight=700, raw=True)
                for i, row in enumerate(body):
                    self.text(x + 38, y + 16 + i * 21, row, 15, raw=True, anchor="start")
                y += 21 * len(body) + 10
            elif kind == "route":
                self.o.append(f'<line x1="{x}" y1="{y+10}" x2="{x+30}" y2="{y+10}" stroke="{ROUTE}" stroke-width="5"/>')
                self.text(x + 38, y + 16, s, 15, raw=True, anchor="start")
                y += 26
            elif kind == "watched":
                self.o.append(
                    f'<line x1="{x}" y1="{y+10}" x2="{x+30}" y2="{y+10}" stroke="{ROUTE}" stroke-width="5" stroke-dasharray="7 6"/>'
                )
                self.text(x + 38, y + 16, s, 15, raw=True, anchor="start")
                y += 26
            else:
                self.text(x, y + 16, s, 15, raw=True, anchor="start", fill="#3d434c")
                y += 22
        self.y = y

    def save(self, path):
        self.unclip()
        self.o.append("</svg>")
        h = max(H, int(getattr(self, 'y', 0)) + 30)
        open(path, "w").write("\n".join(self.o).replace('HEIGHT', str(h)))


# ------------------------------------------------------------------ shared geometry (court frame)
BLOCK_FACE = -4.3  # the long face on the court (as built)
BLOCK_BACK = -8.45  # the back wall as the built flat sets it (window side)
BLOCK_W = -10.5  # the long face's far end (island north)
RET_X = 5.9  # the return's west face
RET_X1 = 9.4
RET_Z = 1.0
E1 = -9.6  # dorm_1e's west face, outside Eric's window
E1_X = (-6.5, 8.4)  # its length along the block
PITCH = 2.3
ERIC_X = -0.49
ROOMS = {2: "201", 1: "202", 0: "203", -1: "205", -2: "206", -3: "207"}
CORR = (-4.5, -3.75)  # 2F corridor: the flats' front wall to the parapet
STAIR = (5.9, 8.1, -5.5, -1.3)  # the stair core in the return: x0, x1, z0, z1
LANDING_Z = -3.7  # landing from z0 to here; flights from here to the mid landing
MID_Z = -2.2


def base_outside(s, ground):
    # dorm_1e: the next block, its west face outside Eric's window
    s.rect(E1_X[0], E1_X[1], Z0 - 1, E1, fill="url(#hatch)", stroke=WALL, sw=3)
    s.rect(E1_X[0], E1_X[1], Z0 - 1, E1, fill="#c9cdd3", op=0.45)
    s.text((E1_X[0] + E1_X[1]) / 2, E1 - 0.35, "next block (dorm_1e): bare concrete wall", 15, fill="#3d434c")
    # the court side: street, bed, court paving
    s.rect(X0 - 1, X1 + 1, 3.8, 6.8, fill=STREET)
    s.text(-6.5, 5.5, "the lane from the plaza (street)", 15, fill="#4d535c")
    s.rect(X0 - 1, X1 + 1, 6.8, Z1 + 1, fill=GREEN)
    if ground:
        s.rect(-6.0, 16, 2.7, 3.8, fill=GREEN, stroke="#9aa79a", sw=1.5)
        s.rect(-0.4, 1.4, 2.7, 3.8, fill=PAVE)  # the gate opening
        s.rect(-6.0, 5.9, -1.2, 2.7, fill=PAVE)
        s.rect(-6.0, 4.3, -0.3, 1.3, fill="#cfccc5")  # the walk
        s.rect(-0.3, 1.3, -1.2, 2.7, fill="#cfccc5")  # the door leg + gate link
        s.rect(X0 - 1, -6.0, -4.3, 3.8, fill=GREEN)
        for px_ in (-0.65, 1.65):
            s.o.append(f'<circle cx="{px(px_)}" cy="{pz(3.25)}" r="7" fill="#8b9097"/>')
        s.text(0.5, 3.45, "gate", 13, fill="#4d535c")
        s.text(-3.2, 0.62, "court walk", 13, fill="#6b716a")
        # frontages either side of the hall (as built)
        s.rect(-5.9, -1.2, BLOCK_FACE, -1.9, fill=SHADE, stroke=WALL, sw=3)
        s.text(-3.55, -2.95, "coin laundry", 15, fill="#3d434c")
        s.text(-3.55, -2.55, "(frontage)", 13, fill="#6b716a")
        s.rect(-5.9, -5.5, -1.9, -1.3, fill="#b8404a")
        s.rect(-5.4, -5.0, -1.9, -1.3, fill="#3f62a8")
        s.text(-5.45, -0.85, "drinks", 12, fill="#4d535c")
        s.rect(2.9, RET_X, BLOCK_FACE, -1.5, fill=SHADE, stroke=WALL, sw=3)
        s.text(4.4, -2.1, "sento", 15, fill="#3d434c")
        s.text(4.4, -1.72, "(frontage)", 13, fill="#6b716a")
        s.rect(4.3, 5.85, -1.3, 1.9, fill="#dcdde0", stroke="#9aa0a8", sw=1.5, dash="5 4")
        s.text(5.1, 0.4, "bikes", 13, fill="#4d535c")
    else:
        # upstairs: the court seen below, faint
        s.rect(-6.0, 5.9, -1.2, 3.8, fill=PAVE, op=0.6)
        s.rect(X0 - 1, -6.0, -4.3, 3.8, fill=GREEN, op=0.8)
        s.rect(-1.1, 2.5, BLOCK_FACE, -1.2, fill="#dfe1e4", stroke="#9aa0a8", sw=1.5, dash="6 5")
        s.text(0.7, -2.4, "hall roof below", 14, fill="#6b716a")
        s.rect(-5.9, -1.2, BLOCK_FACE, -1.9, fill="#dfe1e4", stroke="#9aa0a8", sw=1.5, dash="6 5")
        s.text(-3.55, -2.9, "laundry roof below", 14, fill="#6b716a")
        s.rect(2.9, RET_X, BLOCK_FACE, -1.5, fill="#dfe1e4", stroke="#9aa0a8", sw=1.5, dash="6 5")
        s.text(4.1, -2.0, "sento roof", 14, fill="#6b716a")
        s.text(4.1, -1.65, "below", 14, fill="#6b716a")
        s.text(-3.0, 1.2, "dorm courtyard below", 16, fill="#7c8279")


def block_shell(s):
    # the long block and the return, their floor
    s.rect(BLOCK_W, RET_X, BLOCK_BACK, BLOCK_FACE, fill=FLOOR)
    s.rect(RET_X, RET_X1, BLOCK_BACK, RET_Z, fill=FLOOR)


def stair_core(s, floor):
    x0, x1, z0, z1 = STAIR
    mx = (x0 + x1) / 2
    s.rect(x0, x1, z0, LANDING_Z, fill="#eceef0")
    s.stairs(mx, x1, LANDING_Z, MID_Z, 7)  # flight 1, going up toward the camera
    s.stairs(x0, mx, LANDING_Z, MID_Z, 7)  # flight 2, coming back
    s.rect(x0, x1, MID_Z, z1, fill="#eceef0")
    s.line(mx, LANDING_Z, mx, MID_Z, sw=3)
    # walls round the core (the west wall has the stair window on the flights)
    s.wallx(x0, x1, z0)
    s.wallx(x0, x1, z1)
    s.wallz(z0, z1, x1)
    gaps = [(-5.4, -4.3)] if floor == 0 else [(-4.5, -3.75)]
    s.wallz(z0, z1, x0, gaps=gaps)
    s.line(x0, -3.5, x0, -2.4, stroke="#7fb2d6", sw=6)  # stair window
    s.text(RET_X1 - 0.12, z0 - 0.2, "stairs, 1F to 5F", 15, weight=700, anchor="end")
    s.o.append(f'<text x="{px(x0)-8}" y="{pz(-2.95)}" font-size="12" fill="#3f7fae" text-anchor="end">stair window</text>')


def ground():
    s = Svg(
        "Dorm building, ground floor (1F): the way in",
        "Plan view as the game camera sees it: up is east, into the block. Built today: court, hall front, mailboxes, notice board, passage. New: the rest.",
    )
    base_outside(s, True)
    block_shell(s)
    # the hall (as built) and the one-storey strip behind it
    s.rect(-1.1, 2.5, -2.9, -1.2, fill="#eef0f2")
    s.rect(-1.1, 1.25, BLOCK_FACE, -2.9, fill="#e4e6e9")  # manager's room
    s.rect(1.3, 2.2, BLOCK_FACE, -2.9, fill="#eef0f2")  # passage
    s.rect(2.25, 2.9, BLOCK_FACE, -2.9, fill="#dadde1")
    # the ground-floor corridor inside the block, from the passage to the stairs
    s.rect(-1.1, RET_X, -5.4, BLOCK_FACE, fill="#eef0f2")
    # rooms behind the corridor and north of it, not part of day 1
    s.rect(BLOCK_W, -1.1, BLOCK_BACK, BLOCK_FACE, fill="#dadde1")
    s.rect(-1.1, RET_X, BLOCK_BACK, -5.4, fill="#dadde1")
    s.rect(RET_X1 - 3.5, RET_X1, STAIR[3], RET_Z, fill="#dadde1")
    s.text(-5.8, -6.5, "manager's flat, store, plant room", 15, fill="#5a616b")
    s.text(-5.8, -6.05, "(closed, not part of day 1)", 13, fill="#7a808a")
    s.text(2.4, -7.1, "lounge (lights off at night)", 15, fill="#5a616b")
    s.text(2.4, -6.65, "not part of day 1", 13, fill="#7a808a")
    s.text(7.65, -0.25, "drying room", 13, fill="#5a616b")
    stair_core(s, 0)
    # walls: block
    s.wallx(BLOCK_W, -1.1, BLOCK_FACE)
    s.wallx(2.9, RET_X, BLOCK_FACE)
    s.wallx(BLOCK_W, RET_X1, BLOCK_BACK)
    s.wallz(BLOCK_BACK, RET_Z, RET_X1)
    s.wallx(RET_X, RET_X1, RET_Z)
    s.wallz(STAIR[3], RET_Z, RET_X)
    # ground corridor walls
    s.wallx(-1.1, RET_X, -5.4, gaps=[(3.2, 3.9), (-0.2, 0.5)], sw=3)
    s.wallz(-5.4, BLOCK_FACE, -1.1, sw=3)
    # hall: glass front with the open doors, side walls, back wall with the passage opening
    s.line(-1.1, -1.2, -0.35, -1.2, stroke="#7fb2d6", sw=6)
    s.line(1.35, -1.2, 2.5, -1.2, stroke="#7fb2d6", sw=6)
    s.text(0.5, -0.95, "glass doors (open)", 12, fill="#3f7fae")
    s.wallz(-2.9, -1.2, -1.1)
    s.wallz(-2.9, -1.2, 2.5)
    s.wallx(-1.1, 2.5, -2.9, gaps=[(1.3, 2.2)])
    # manager's room: wall to the passage with its window, door on the corridor
    s.wallz(BLOCK_FACE, -2.9, 1.25, gaps=[(-3.95, -3.25)], sw=4)
    s.line(1.25, -3.95, 1.25, -3.25, stroke="#7fb2d6", sw=7)
    s.wallx(-1.1, 1.25, BLOCK_FACE, gaps=[(0.35, 1.0)], sw=4)
    s.wallz(BLOCK_FACE, -2.9, 2.25, sw=3)
    s.wallx(2.25, 2.9, BLOCK_FACE, sw=3)
    s.wallz(BLOCK_FACE, -2.9, 2.9, sw=3)
    s.text(0.07, -3.7, "manager's", 14, weight=700)
    s.text(0.07, -3.35, "room", 14, weight=700)
    s.text(0.07, -3.0, "管理人室", 12, fill="#5a616b")
    # mailboxes on the hall's back wall (hall side), notice board right of the passage, doormat, umbrella stand
    s.rect(-0.8, 0.7, -2.9, -2.68, fill="#9aa0a8", stroke=WALL, sw=1.5)
    s.text(-0.05, -2.35, "mailboxes (24)", 13)
    s.rect(2.22, 2.48, -2.9, -2.82, fill="#b0a98f")
    s.text(2.45, -2.55, "notice board", 11, anchor="end")
    s.rect(-0.25, 1.25, -1.75, -1.25, fill="#b6b8bc", op=0.8)
    s.text(0.5, -1.4, "mat", 11, fill="#4d535c")
    s.text(0.7, -2.1, "", 1)
    s.text(-0.3, -1.95, "", 1)
    s.text(1.75, -3.15, "", 1)
    s.text(-0.95, -1.45, "hall", 16, weight=700, anchor="start")
    s.text(2.55, -4.85, "", 1)
    s.text(4.0, -5.02, "ground-floor corridor", 12, fill="#5a616b")
    s.text(-0.6, -4.72, "", 1)
    s.text(2.55, -3.25, "", 1)
    # route: gate to the doors to the passage (walked), then the watched part
    s.route([(0.5, 3.8), (0.5, -1.2), (0.6, -2.2), (1.75, -2.6), (1.75, -3.6)], arrow=False)
    s.route([(1.75, -3.6), (1.75, -4.75), (7.55, -4.75), (7.55, -1.75), (6.45, -1.75), (6.45, -3.9)], dash="9 7")
    s.goal(0.5, 3.0, 1)
    s.goal(0.5, -1.95, 2)
    s.trip(1.75, -3.6)
    s.cam(0.5, 7.0, 1, spread=0.55, reach=3.0)
    s.cam(2.9, -0.2, 2, spread=0.7, reach=2.2, dirx=-0.45, dirz=-1)
    s.compass()
    s.scalebar()
    s.panel(
        [
            ("h", "Route"),
            ("route", "walked by the player"),
            ("watched", "the trip up: watched, no input"),
            ("", "Gate to passage: about 9 units, 6 seconds."),
            ("", "Trip: passage, corridor, stairs, about 5 s."),
            ("h", "Goal line"),
            ("g", (1, ["Arriving through the gate:", "“Go in through the dorm entrance.", "Your room is 203.”", "Marker on the hall doors."])),
            ("g", (2, ["Stepping inside the doors:", "“Room 203 is on 2F. The stairs", "are through the back.”", "Marker on the passage."])),
            ("h", "Camera"),
            ("c", (1, ["Court camera as built, looking east,", "following Eric through the gate and", "into the hall (its front is cut low)."])),
            ("c", (2, ["Same camera closes in on Eric at the", "passage, then the crossfade (T)."])),
            ("t", ("T", ["Trip to 2F: he walks through the", "passage; crossfade to him coming up", "the last steps onto the 2F landing."])),
            ("h", "In the hall"),
            ("", "Shoes stay on: every flat has its own"),
            ("", "genkan, so no shoe lockers or step."),
            ("", "Manager's window faces the passage,"),
            ("", "curtain drawn: closed for the night."),
        ]
    )
    # mailbox inset under the legend
    x = px(X1) + 24
    y = s.y + 18
    s.text(x, y + 14, "Mailbox bank, 6 x 4 (hall's back wall)", 16, weight=700, raw=True, anchor="start")
    y += 28
    cols = ["01", "02", "03", "05", "06", "07"]
    for r, fl in enumerate([5, 4, 3, 2]):
        for c, n in enumerate(cols):
            X = x + c * 74
            Y = y + r * 40
            hi = fl == 2 and n == "03"
            s.o.append(
                f'<rect x="{X}" y="{Y}" width="68" height="34" rx="3" fill="{"#dff0ef" if hi else "#e4e6e9"}" stroke="{ROUTE if hi else "#9aa0a8"}" stroke-width="{3 if hi else 1.2}"/>'
            )
            s.text(X + 34, Y + 22, f"{fl}{n}", 14, raw=True, weight=700 if hi else 400)
    s.text(x, y + 4 * 40 + 20, "No 4 in room numbers (shi, as in death):", 14, raw=True, anchor="start", fill="#3d434c")
    s.text(x, y + 4 * 40 + 41, "201, 202, 203, 205, 206, 207. 203 has a", 14, raw=True, anchor="start", fill="#3d434c")
    s.text(x, y + 4 * 40 + 62, "strip of tape with エリック on it.", 14, raw=True, anchor="start", fill="#3d434c")
    s.y = y + 4 * 40 + 70
    return s


def flat(s, cx, number, state, eric=False, interior=False):
    x0, x1 = cx - 1.15, cx + 1.15
    front, part, back = -4.5, -5.65, BLOCK_BACK
    s.rect(x0, x1, back, front, fill=ERIC if eric else "#eceef0")
    # partition between the room and the entry strip, with its doorway
    dx = cx + (-0.4 + 0.34) / 2
    s.wallx(x0, x1, part, gaps=[(cx - 0.4, cx + 0.34)], sw=2.5)
    # front wall with the door, back wall with the window
    s.wallx(x0, x1, front, gaps=[(cx - 0.44, cx + 0.16)], sw=5)
    s.wallx(x0, x1, back, sw=5)
    s.line(cx - 0.45, back, cx + 0.3, back, stroke="#7fb2d6", sw=7)
    # door leaf swung in
    s.line(cx + 0.16, front, cx + 0.16, front - 0.55, stroke="#5a6a80", sw=2.5)
    # kitchen, unit bath
    s.rect(x0 + 0.1, cx - 0.69, part, front, fill="#d7dade")
    s.rect(cx + 0.38, x1 - 0.1, part, front, fill="#d7dade")
    s.line(cx + 0.38, part, cx + 0.38, front, stroke=WALL, sw=2.5)
    s.rect(cx - 0.69, cx + 0.34, -5.15, front, fill="#c3c7cc")  # genkan tiles
    s.wallz(back, front, x0, sw=4)
    s.wallz(back, front, x1, sw=4)
    if eric:
        s.text(cx - 0.9, part + 0.35, "", 1)
        s.rect(x0 + 0.1, x0 + 0.72, back, -6.9, fill="#9fb0d6")  # bed along the left wall
        s.rect(x0 + 0.1, x0 + 0.72, back, back + 0.4, fill="#8d9097")  # desk, back-left
        s.rect(x1 - 0.55, x1 - 0.1, back, -7.4, fill="#cfc9b8")  # oshiire, back-right
        s.rect(x1 - 0.5, x1 - 0.1, -7.2, -6.2, fill="#c8b79a")  # boxes on the right wall
        s.rect(cx - 0.2, cx + 0.2, -6.3, -5.95, fill="#b9b2a4")  # folding table
        s.text(x0 + 0.41, -7.4, "bed", 11, fill="#2b3038")
        s.text(x1 - 0.33, -6.75, "boxes", 10, fill="#2b3038")
        s.text(cx - 0.9, -5.0, "", 1)
        s.o.append(f'<text x="{px(x0+0.35)}" y="{pz(-5.05)}" font-size="10" fill="#2b3038" transform="rotate(-90 {px(x0+0.35)} {pz(-5.05)})" text-anchor="middle">kitchen</text>')
        s.o.append(f'<text x="{px(x1-0.33)}" y="{pz(-5.05)}" font-size="10" fill="#2b3038" transform="rotate(-90 {px(x1-0.33)} {pz(-5.05)})" text-anchor="middle">bath</text>')
        s.text(cx - 0.17, -4.72, "genkan", 10, fill="#2b3038")
    # number plate
    s.o.append(
        f'<rect x="{px(cx)-30:.1f}" y="{pz(-6.95)-20:.1f}" width="60" height="28" rx="4" fill="{ROUTE if eric else "white"}" stroke="{ROUTE if eric else "#9aa0a8"}" stroke-width="1.5"/>'
    )
    s.text(cx, -6.95 - 0.07, number, 17, fill="white" if eric else INK, weight=700)
    if state:
        s.text(cx, -6.3, state, 12, fill="#5a616b")


def floor2(interior):
    s = Svg(
        ("Dorm building, 2F (Eric's floor): " + ("interior corridor (B)" if interior else "open-air corridor (A)")),
        "Six flats a floor, numbered from the stairs. His flat 203 and the two either side are built already; they fix the corridor and the window wall.",
    )
    base_outside(s, False)
    block_shell(s)
    # the flats
    for k, n in ROOMS.items():
        cx = ERIC_X + k * PITCH
        state = {1: "home: TV on", -1: "out, dark", 2: "dark", -2: "desk lamp on"}.get(k)
        flat(s, cx, n, state, eric=(k == 0))
    s.text(ERIC_X, -8.85, "", 1)
    # the far end: fire escape
    fe0 = ERIC_X - 3.5 * PITCH
    s.rect(BLOCK_W, fe0, BLOCK_BACK, -3.75, fill="#e4e6e9")
    s.wallz(BLOCK_BACK, -4.5, BLOCK_W)
    s.stairs(BLOCK_W + 0.2, fe0 - 0.2, -7.6, -5.2, 6)
    s.text((BLOCK_W + fe0) / 2, -7.85, "fire escape", 12, fill="#5a616b")
    # the corridor
    c0, c1 = CORR
    s.rect(BLOCK_W, RET_X, c0, c1, fill="#e8ecef" if interior else "#eef1f3")
    if interior:
        # a full wall on the court side with small windows, a ceiling light every flat
        s.wallx(BLOCK_W, RET_X, c1, sw=5)
        for k in ROOMS:
            cx = ERIC_X + k * PITCH
            s.line(cx - 0.5, c1, cx + 0.5, c1, stroke="#7fb2d6", sw=6)
            s.o.append(f'<circle cx="{px(cx+0.9)}" cy="{pz((c0+c1)/2)}" r="5" fill="#f3d27a" stroke="#b59a4a"/>')
        s.text(-7.0, c1 + 0.45, "corridor wall with a small window at each flat", 13, fill="#3f7fae")
    else:
        # a low parapet, open above; a light over each door
        s.line(BLOCK_W, c1, RET_X, c1, stroke="#7d848d", sw=3.5)
        for k in ROOMS:
            cx = ERIC_X + k * PITCH
            s.o.append(f'<circle cx="{px(cx-0.14)}" cy="{pz(c0+0.12)}" r="5" fill="#f3d27a" stroke="#b59a4a"/>')
        s.text(-7.0, c1 + 0.45, "low parapet, open to the court", 13, fill="#6b716a")
    s.text(-4.0, (c0 + c1) / 2 + 0.12, "corridor", 13, fill="#5a616b")
    # the stairs and the rest of the return
    stair_core(s, 1)
    s.rect(RET_X, RET_X1, BLOCK_BACK, STAIR[0] and -5.5, fill="#dadde1")
    s.rect(RET_X, RET_X1, STAIR[3], RET_Z, fill="#dadde1")
    s.rect(STAIR[1], RET_X1, -5.5, STAIR[3], fill="#dadde1")
    s.text(7.65, -7.0, "store", 13, fill="#5a616b")
    s.text(7.65, -0.25, "drying room", 13, fill="#5a616b")
    s.wallx(RET_X, RET_X1, BLOCK_BACK)
    s.wallz(BLOCK_BACK, RET_Z, RET_X1)
    s.wallx(RET_X, RET_X1, RET_Z)
    s.wallz(STAIR[3], RET_Z, RET_X)
    s.wallz(BLOCK_BACK, -5.5, RET_X, sw=3)
    s.wallx(BLOCK_W, fe0, BLOCK_BACK)
    # the gap to the next block
    s.line(3.3, BLOCK_BACK - 0.05, 3.3, E1 + 0.05, stroke=GOAL, sw=2)
    s.text(3.45, (BLOCK_BACK + E1) / 2 + 0.12, "1.3 units, about 2 m", 13, fill=GOAL, anchor="start")
    s.text(ERIC_X, -9.05, "his window: the wall", 12, fill="#3d434c")
    # route: up the last flight, onto the landing, along to 203, in to room_entry
    s.route([(6.45, -3.7), (6.45, -4.1), (5.9, -4.12), (-0.63, -4.12)], dash=None, arrow=False)
    s.route([(6.45, -2.2), (6.45, -3.7)], dash="9 7", arrow=False)
    s.route([(-0.63, -4.12), (-0.63, -5.0), (-0.59, -5.85)], dash="9 7")
    s.goal(6.9, -4.9, 3)
    s.goal(0.35, -4.12, 4)
    s.cam(2.3, 1.9, 3, spread=1.2, reach=5.3)
    s.cam(ERIC_X, -2.15, 4, spread=0.75, reach=2.6)
    s.compass()
    s.scalebar()
    rows = [
        ("h", "Route"),
        ("route", "walked by the player"),
        ("watched", "watched: the last steps up; stepping in"),
        ("", "Landing to 203's door: about 7 units, 5 s."),
        ("", "Doors on the way: 201, 202, then 203."),
        ("h", "Goal line"),
        ("g", (3, ["Arriving on the landing:", "“Room 203.” Marker on its door;", "the door plates are readable."])),
        ("g", (4, ["At 203's door: the goal clears.", "He steps over the genkan to", "room_entry and the day ends as now."])),
        ("h", "Camera"),
        ("c", (3, ["Looks east down onto the corridor,", "roofs and near parapet cut low, as", "the room view is; follows Eric left", "from the landing to 203."])),
        ("c", (4, ["The room camera as built: it widens", "to the whole flat as he steps in."])),
        ("h", "Built already (dorms scene)"),
        ("", "203 with 202 (home) on its right and 205"),
        ("", "(out) on its left, 201 and 206 at the frame"),
        ("", "edges; the corridor; his window 1.3 from"),
        ("", "the next block's wall. He arrives from the"),
        ("", "right, which is the stairs' side here."),
    ]
    if interior:
        rows += [
            ("h", "B: what changes"),
            ("", "The corridor is indoors: a wall with small"),
            ("", "windows on the court side, strip lights."),
            ("", "The court sees a plain wall with a row of"),
            ("", "small windows on each floor; his door is"),
            ("", "not visible from the court."),
            ("", "Darker, more like an older company dorm."),
        ]
    else:
        rows += [
            ("h", "A: what changes"),
            ("", "The court face shows these corridors:"),
            ("", "parapets, doors, meter boxes, lit kitchen"),
            ("", "windows (today it shows balconies). 203's"),
            ("", "door is almost straight above the hall"),
            ("", "doors, so it can be seen from the court."),
        ]
    s.panel(rows)
    return s


out = sys.argv[1]
ground().save(f"{out}/01-ground-floor.svg")
floor2(False).save(f"{out}/02-floor2-open-air.svg")
floor2(True).save(f"{out}/03-floor2-interior.svg")
