"""Composite original painted feature alpha over flat skin for portable glTF materials."""
import pathlib,sys
from PIL import Image
p=pathlib.Path(sys.argv[1])
for body,col in [('mio','#f7e3d8'),('eric','#f6dccf')]:
    eye=Image.open(p/f'{body}-face.png').convert('RGBA');base=Image.new('RGBA',eye.size,col);base.alpha_composite(eye);base.convert('RGB').save(p/f'{body}-face-opaque.png')
