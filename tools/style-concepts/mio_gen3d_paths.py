# char-mio-gen3d (#171 track B): where things are. Plain Python (no bpy) so Blender and the image scripts share it.
# Pictures and models live in the main checkout under art/parts/style-concepts/claude-miogen3d/ (git-ignored binaries).
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
MAIN = os.path.dirname(subprocess.check_output(['git', '-C', HERE, 'rev-parse', '--path-format=absolute',
                                                '--git-common-dir'], text=True).strip())
SC = os.path.join(MAIN, 'art/parts/style-concepts')
OUT = os.path.join(SC, 'claude-miogen3d')
RAW = os.path.join(OUT, 'raw')        # every generated 3D result, as the tool returned it
VIEWS = os.path.join(OUT, 'views')    # the multi-view input pictures
BUILD = os.path.join(OUT, 'build')    # every rebuild attempt, bg-NN/
CLEAN = os.path.join(SC, 'mio-ref-clean/final.png')
CLEAN_CUT = os.path.join(SC, 'mio-ref-clean/final-cutout.png')
I2I = os.path.join(SC, 'claude-mioi2i')
T3 = os.path.join(I2I, 'gen/t3')
