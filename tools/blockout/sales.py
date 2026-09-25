"""Sales department blockout (day 1, ~10:30: the player comes up from the basement to get a folder from Rei at her desk).

A real Japanese sales floor in the island layout (島型): plain grey steel desks pushed together in facing pairs, three islands,
the section chief's desk at the head of each island facing his team, low-back chairs tucked in. Windows along the right wall
with blinds half down, a 行先ボード whiteboard and a sales-target chart on the back wall, low cabinets along the left wall,
fluorescent ceiling panels. No people.

Room: x 0..16 m (right wall = windows), y 0..14 m (y=0 is the entrance wall behind the camera), ceiling 2.7 m.
Camera: standing eye height (1.6 m) just inside the entrance near the left, looking diagonally across the islands.
The nearest island (x ~ 4.5) has Rei's desk: the near end on its right-hand row, tidier than the rest, one small plant.
Run: blender -b --factory-startup -P tools/blockout/sales.py -- <out_dir>
"""
import sys, os, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blk

WALL = (0.89, 0.89, 0.86)
CEIL = (0.93, 0.93, 0.92)
CARPET = (0.52, 0.54, 0.56)
DESK = (0.70, 0.71, 0.72)
TOP = (0.80, 0.81, 0.80)
CHAIR = (0.30, 0.34, 0.40)
BLACK = (0.16, 0.17, 0.18)
PAPER = (0.94, 0.94, 0.92)
BINDER = [(0.35, 0.45, 0.60), (0.85, 0.85, 0.82), (0.55, 0.58, 0.60), (0.30, 0.40, 0.35)]
LIGHT = (1.0, 1.0, 1.0)
W, D, CH = 16.0, 14.0, 2.7
rnd = random.Random(5)


def room():
    blk.box('floor', 0, W, 0, D, -0.1, 0, CARPET)
    blk.box('ceiling', 0, W, 0, D, CH, CH + 0.1, CEIL)
    blk.box('wall_l', -0.1, 0, 0, D, 0, CH, WALL)
    blk.box('wall_back', 0, W, D, D + 0.1, 0, CH, WALL)
    blk.box('wall_front', 0, W, -0.1, 0, 0, CH, WALL)
    # right wall: windows from 0.85 to 2.45 m with mullions every 1.8 m; blinds pulled half way down
    blk.box('wall_r_low', W, W + 0.1, 0, D, 0, 0.85, WALL)
    blk.box('wall_r_top', W, W + 0.1, 0, D, 2.45, CH, WALL)
    y = 0.0
    while y < D:
        blk.box(f'mull{y:.1f}', W - 0.02, W + 0.1, y, y + 0.12, 0.85, 2.45, (0.75, 0.76, 0.78))
        blk.box(f'blind{y:.1f}', W - 0.06, W - 0.04, y + 0.12, y + 1.8, 1.65, 2.45, (0.90, 0.90, 0.88))
        y += 1.8
    blk.box('sill', W - 0.25, W, 0, D, 0.80, 0.85, (0.80, 0.80, 0.80))
    # outside: the office tower across the street (seen through the lower half of the windows)
    blk.box('outside_bldg', W + 25, W + 45, -40, 60, -30, 60, (0.78, 0.82, 0.86))
    for i in range(12):
        blk.box(f'outside_win{i}', W + 24.9, W + 25, -40, 60, -30 + i * 4, -29 + i * 4, (0.55, 0.62, 0.70))
    # the ceiling T-bar grid (1.2 m), so the ceiling reads as a surface and not empty space (a floor grid came out as big green tiles)
    x = 1.2
    while x < W:
        blk.box(f'cx{x:.1f}', x - 0.012, x + 0.012, 0, D, CH - 0.004, CH, (0.82, 0.82, 0.82))
        x += 1.2
    y = 1.2
    while y < D:
        blk.box(f'cy{y:.1f}', 0, W, y - 0.012, y + 0.012, CH - 0.004, CH, (0.82, 0.82, 0.82))
        y += 1.2
    # skirting boards
    blk.box('skirt_b', 0, W, D - 0.02, D, 0, 0.08, (0.40, 0.41, 0.43))
    blk.box('skirt_l', 0, 0.02, 0, D, 0, 0.08, (0.40, 0.41, 0.43))
    # ceiling light panels (600 x 1200) in a grid
    for x in range(2, 16, 3):
        for y in range(2, 14, 3):
            blk.box(f'lp{x}_{y}', x - 0.3, x + 0.3, y - 0.6, y + 0.6, CH - 0.03, CH, LIGHT)


def desk(name, x0, x1, y0, y1, facing, tidy=False, messy=1.0):
    """Steel desk: top at 0.72 m, side panels, a monitor, a phone, papers. facing: +1/-1 in x (or 'y+'/'y-')."""
    blk.box(name + 'top', x0, x1, y0, y1, 0.70, 0.73, TOP)
    if facing in (1, -1):
        for yy in (y0, y1 - 0.04):
            blk.box(name + f'leg{yy:.1f}', x0, x1, yy, yy + 0.04, 0, 0.70, DESK)
        # drawer pedestal on one side
        blk.box(name + 'ped', x0 + 0.05, x1 - 0.05, y1 - 0.45, y1 - 0.05, 0, 0.66, DESK)
        back = x1 if facing == 1 else x0  # side away from the sitter
        bx = back - facing * 0.18
        cy = (y0 + y1) / 2
        blk.box(name + 'mon', bx - 0.02, bx + 0.02, cy - 0.24, cy + 0.24, 0.84, 1.12, BLACK)
        blk.box(name + 'monst', bx - 0.08, bx + 0.08, cy - 0.04, cy + 0.04, 0.73, 0.85, BLACK)
        px = back - facing * 0.4
        blk.box(name + 'phone', px - 0.1, px + 0.1, y0 + 0.08, y0 + 0.30, 0.73, 0.80, (0.25, 0.26, 0.28))
        sx = x0 + 0.1 if facing == 1 else x1 - 0.35
        if tidy:
            blk.box(name + 'stack', sx, sx + 0.25, y1 - 0.4, y1 - 0.1, 0.73, 0.80, PAPER)
            blk.cyl(name + 'plant', back - facing * 0.15, y1 - 0.15, 0.07, 0.73, 0.86, (0.85, 0.85, 0.84))
            blk.cyl(name + 'leaves', back - facing * 0.15, y1 - 0.15, 0.13, 0.86, 1.05, (0.35, 0.55, 0.38), 10)
        else:
            n = 1 + int(rnd.random() * 3 * messy)
            for k in range(n):
                hh = rnd.uniform(0.04, 0.22)
                yy = y1 - 0.4 - k * 0.12
                blk.box(name + f'pile{k}', sx, sx + 0.3, yy - 0.3, yy, 0.73, 0.73 + hh, BINDER[k % 4] if k % 2 else PAPER)


def chair(name, x, y, face):
    """Low-back office chair. face: direction the sitter faces as (dx, dy)."""
    blk.cyl(name + 'base', x, y, 0.28, 0.04, 0.08, BLACK, 5)
    blk.cyl(name + 'post', x, y, 0.03, 0.08, 0.42, BLACK, 8)
    blk.box(name + 'seat', x - 0.24, x + 0.24, y - 0.24, y + 0.24, 0.42, 0.48, CHAIR)
    dx, dy = face
    bx, by = x - dx * 0.24, y - dy * 0.24
    if dx:
        blk.box(name + 'back', bx - 0.03, bx + 0.03, y - 0.22, y + 0.22, 0.55, 0.92, CHAIR)
    else:
        blk.box(name + 'back', x - 0.22, x + 0.22, by - 0.03, by + 0.03, 0.55, 0.92, CHAIR)


def island(k, xc, y0, pairs=4, rei=False):
    """Two facing rows of desks along y, the chief's desk across the far end facing back down the island."""
    dw, dd = 1.2, 0.7
    for i in range(pairs):
        ya, yb = y0 + i * dw, y0 + (i + 1) * dw
        # left row: sitter on the left (outside), facing +x toward the right row
        desk(f'i{k}L{i}', xc - dd, xc, ya, yb, 1, messy=1.0)
        chair(f'i{k}Lc{i}', xc - dd - 0.25, (ya + yb) / 2, (1, 0))
        # right row: sitter on the right, facing -x
        desk(f'i{k}R{i}', xc, xc + dd, ya, yb, -1, tidy=(rei and i == 0), messy=1.0)
        chair(f'i{k}Rc{i}', xc + dd + 0.25, (ya + yb) / 2, (-1, 0))
    # chief's desk at the head, facing the team (toward -y)
    ye = y0 + pairs * dw + 0.6
    blk.box(f'i{k}chief_top', xc - 0.8, xc + 0.8, ye, ye + 0.8, 0.70, 0.73, TOP)
    for xx in (xc - 0.8, xc + 0.76):
        blk.box(f'i{k}chief_leg{xx:.1f}', xx, xx + 0.04, ye, ye + 0.8, 0, 0.70, DESK)
    blk.box(f'i{k}chief_front', xc - 0.8, xc + 0.8, ye, ye + 0.03, 0.2, 0.70, DESK)
    blk.box(f'i{k}chief_mon', xc - 0.3, xc + 0.3, ye + 0.55, ye + 0.59, 0.85, 1.2, BLACK)
    blk.box(f'i{k}chief_phone', xc + 0.4, xc + 0.62, ye + 0.1, ye + 0.3, 0.73, 0.80, (0.25, 0.26, 0.28))
    blk.box(f'i{k}chief_pile', xc - 0.7, xc - 0.4, ye + 0.1, ye + 0.4, 0.73, 0.85, PAPER)
    chair(f'i{k}chief_c', xc, ye + 1.15, (0, -1))


def walls_stuff():
    # 行先ボード: whiteboard grid on the back wall (names / destination / return time)
    blk.box('board', 1.5, 4.5, D - 0.05, D, 0.9, 2.0, (0.97, 0.97, 0.97))
    blk.box('board_frame', 1.45, 4.55, D - 0.03, D, 0.85, 2.05, (0.70, 0.72, 0.74))
    for r in range(8):
        blk.box(f'board_row{r}', 1.5, 4.5, D - 0.07, D - 0.05, 1.0 + r * 0.125, 1.005 + r * 0.125, (0.55, 0.55, 0.58))
    for c in (2.3, 3.4):
        blk.box(f'board_col{c}', c, c + 0.01, D - 0.07, D - 0.05, 0.95, 1.95, (0.55, 0.55, 0.58))
    # sales-target bar chart taped to the wall
    blk.box('chart', 5.5, 7.0, D - 0.03, D, 1.2, 2.0, PAPER)
    for i, h in enumerate((0.25, 0.4, 0.55, 0.35, 0.6)):
        blk.box(f'bar{i}', 5.7 + i * 0.25, 5.85 + i * 0.25, D - 0.05, D - 0.03, 1.3, 1.3 + h, (0.45, 0.55, 0.70))
    # a clock
    blk.cyl('clock', 9.0, D - 0.05, 0.16, 0, 0.05, (0.95, 0.95, 0.95), 16).rotation_euler = (1.5708, 0, 0)
    bpy_fix_clock()
    # low storage cabinets along the left wall and the back wall right part, binders on top
    blk.box('cab_l', 0, 0.45, 2.5, 12.5, 0, 1.1, (0.80, 0.81, 0.80))
    for i in range(14):
        y = 2.7 + i * 0.7
        blk.box(f'cabbind{i}', 0.05, 0.35, y, y + 0.08 + rnd.uniform(0, 0.25), 1.1, 1.4, BINDER[i % 4])
    blk.box('cab_b', 10.5, 15.5, D - 0.45, D, 0, 1.1, (0.80, 0.81, 0.80))
    blk.box('copier', 14.2, 15.4, 0.6, 1.4, 0, 1.2, (0.86, 0.86, 0.83))


def bpy_fix_clock():
    import bpy
    ob = bpy.data.objects['clock']
    ob.location = (9.0, D - 0.03, 2.2)


if __name__ == '__main__':
    out = blk.out_dir()
    blk.reset()
    room()
    island(0, 4.6, 2.4, rei=True)
    island(1, 8.6, 2.4)
    island(2, 12.6, 2.4)
    walls_stuff()
    blk.camera((1.6, 0.3, 1.6), (8.5, 9.0, 0.8), lens=22)
    blk.render(out, 'sales', sky=((0.80, 0.86, 0.92), (0.90, 0.93, 0.95)), sun=(0.6, -0.2, 0.8), far=200.0)
