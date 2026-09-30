"""Archive every render in labelled sheets and emit the final review groups."""
import os,pathlib,subprocess,sys
base=pathlib.Path('art/parts/astra');attempt=sys.argv[1];p=base/attempt;r=p/'renders';exe=str(pathlib.Path.home()/'ai/flat-venv/bin/python');helper='tools/creator/blender/sheet.py'
def sheet(name,rows,height=280):
    args=[exe,helper,str(p/name)]
    for i,(label,paths) in enumerate(rows):
        if i:args.append('--')
        args.extend([label,*map(str,paths)])
    subprocess.run(args,check=True,env={**os.environ,'SHEET_H':str(height)})
files=sorted(r.glob('*.png'),key=lambda f:(f.stat().st_mtime_ns,f.name))
for i in range(0,len(files),16):
    part=files[i:i+16];rows=[(attempt+' / all renders',[*part[j:j+4]]) for j in range(0,len(part),4)]
    sheet(f'all-renders-{i//16+1:02}.webp',rows,240)
for body in ['mio','eric']:
    def paths(tag,shots):return [r/f'{body}-{tag}-{x}.png' for x in shots]
    views=['front','three-quarter','side','back']
    if not (r/f'{body}-dressed-back.png').exists():continue
    sheet(body+'-standing.webp',[(body+' dressed',paths('dressed',views)),(body+' bare body',paths('bare',views)),(body+' without hair',paths('nohair',['front','face','face-3q']))],340)
    sheet(body+'-details.webp',[(body+' face and neck',paths('dressed',['face','face-3q','neck','neck-back'])),('Hood inside / cuff / shoes / bare hand',[r/f'{body}-hoodinside-hood.png',*paths('dressed',['cuff','feet']),r/f'{body}-bare-hand.png']),('Bare neck and ankle joins',paths('bare',['neck','neck-back','feet','side']))],340)
    walks=['time0','time0.3','time0.6','time0.9'] if (r/f'{body}-time0-front.png').exists() else ['8','20']
    sheet(body+'-motion.webp',[(body+' walk / '+('seconds '+tag[4:] if tag.startswith('time') else 'frame '+tag),paths(tag,views)) for tag in walks]+[(body+' approved idle / '+tag,paths(tag,views)) for tag in ['idle1','idle3']],340)
