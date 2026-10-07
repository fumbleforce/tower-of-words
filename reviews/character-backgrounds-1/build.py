"""Rebuild this reader and its cards from notes/character-backgrounds/*.md.
Run: python3 reviews/character-backgrounds-1/build.py
"""
from pathlib import Path
import hashlib,html,json,re,posixpath
base=Path(__file__).resolve().parents[2];src=base/'notes/character-backgrounds';out=base/'reviews/character-backgrounds-1';out.mkdir(exist_ok=True)
order=['eric','carina','mio','mori','kenji','emi','guard','kuroda','kuro','aoi','rei','tama','kaori','yuzuki','tsubasa','kanae','sumi','saki','nanami','kiyoko','goro','jun','cctv']
repo='https://github.com/fumbleforce/tower-of-words/blob/main/'
def slug(s):return re.sub(r'[^\w\- ]','',s.strip().lower()).replace(' ','-')
def link(raw,ident):
 if raw.startswith('https:'):return raw
 path,_,frag=raw.partition('#');norm=posixpath.normpath('notes/character-backgrounds/'+path)
 if norm.startswith('notes/character-backgrounds/') and norm.endswith('.md'):
  key=Path(norm).stem
  return '#'+(key if not frag else key+'-'+frag)
 if norm=='reviews/character-backgrounds-1/review.json':return '../../bible/#review/character-backgrounds-1'
 return repo+norm+('#'+frag if frag else '')
def inline(text,ident):
 text=html.escape(text)
 text=re.sub(r'\[([^]]+)\]\(([^)]+)\)',lambda m:'<a href="'+html.escape(link(html.unescape(m[2]),ident),quote=True)+'">'+m[1]+'</a>',text)
 return re.sub(r'`([^`]+)`',r'<code>\1</code>',text)
def md(text,ident):
 result=[];lines=text.splitlines();i=0
 while i<len(lines):
  line=lines[i]
  if not line.strip():i+=1;continue
  if line.startswith('# '):i+=1;continue
  if line.startswith('## '):
   title=line[3:];result.append('<h3 id="'+ident+'-'+slug(title)+'">'+inline(title,ident)+'</h3>');i+=1;continue
  if line.startswith('|'):
   rows=[]
   while i<len(lines) and lines[i].startswith('|'):
    row=lines[i];i+=1
    if re.fullmatch(r'[|\- :]+',row):continue
    cells=[inline(x.strip(),ident) for x in row.strip('|').split('|')]
    rows.append('<tr>'+''.join('<'+('th' if not rows else 'td')+'>'+c+'</'+('th' if not rows else 'td')+'>' for c in cells)+'</tr>')
   result.append('<div class="table"><table>'+''.join(rows)+'</table></div>');continue
  if re.match(r'^\d+\. ',line):
   items=[]
   while i<len(lines) and re.match(r'^\d+\. ',lines[i]):items.append('<li>'+inline(re.sub(r'^\d+\. ','',lines[i]),ident)+'</li>');i+=1
   result.append('<ol>'+''.join(items)+'</ol>');continue
  para=[line];i+=1
  while i<len(lines) and lines[i].strip() and not re.match(r'^(## |\d+\. |\|)',lines[i]):para.append(lines[i]);i+=1
  result.append('<p>'+inline(' '.join(para),ident)+'</p>')
 return '\n'.join(result)
portraits={i:'game3d/assets/portraits/'+i+'-neutral.webp' for i in order[:11]}
portraits.update({'kaori':'art/approved/kaori/kaori-after.webp','yuzuki':'art/approved/yuzuki/yuzuki-e-after.webp','tsubasa':'art/approved/tsubasa/tsubasa-face-e85-11.webp','kanae':'art/approved/kanae/kanae-after.webp','sumi':'art/approved/sumi/sumi-after.webp','saki':'art/approved/saki/saki-after.webp','nanami':'art/approved/nanami/nanami-g-after.webp','kiyoko':'art/approved/kiyoko/kiyoko-camel-after.webp','goro':'art/approved/goro/goro-after.webp','jun':'art/approved/jun/jun-after.webp','cctv':'art/approved/cctv/nanami-f-after.webp'})
parts=[];options=[];links=[];nav=[];hashes={}
for ident in ['index']+order:
 text=(src/(ident+'.md')).read_text();hashes[ident]=hashlib.sha256(text.encode()).hexdigest();name=text.splitlines()[0][2:]
 if ident=='index':name='Coverage and source notes'
 nav.append('<a href="#'+ident+'">'+html.escape(name)+'</a>')
 parts.append('<details id="'+ident+'"><summary>'+html.escape(name)+'</summary><article>'+md(text,ident)+'<p class="source">Source: <a href="'+repo+'notes/character-backgrounds/'+ident+'.md">'+ident+'.md</a></p></article></details>')
 if ident=='index':continue
 summary=next(x[len('Proposed in play: '):] for x in text.splitlines() if x.startswith('Proposed in play: '))
 opt={'id':ident,'label':ident+' · '+name,'note':summary+' Full history and discoveries: use the '+name+' reader link in the links above.'}
 if ident in portraits:
  assert (base/portraits[ident]).is_file(),portraits[ident]
  opt['image']=portraits[ident]
 options.append(opt);links.append({'label':name+' — full dossier','href':'reviews/character-backgrounds-1/index.html#'+ident})
page='''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Character backgrounds · Amakawa</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f6f8f8;color:#203237;font:17px/1.65 system-ui,sans-serif}main{max-width:980px;margin:auto;padding:36px 24px 80px}h1{font-size:clamp(28px,5vw,42px);line-height:1.15;margin:16px 0}h3{line-height:1.3;margin-top:32px}a{color:#146c73;text-underline-offset:3px}a:focus-visible,summary:focus-visible{outline:3px solid #149daa;outline-offset:4px}nav{display:flex;flex-wrap:wrap;gap:8px 18px;margin:24px 0 32px;padding:18px;background:white;border:1px solid #dce4e5;border-radius:8px}nav a{font-size:15px}details{margin:12px 0;background:white;border:1px solid #cedadb;border-radius:8px;scroll-margin-top:12px}summary{cursor:pointer;padding:17px 20px;font-size:21px;font-weight:650}article{padding:0 24px 24px;max-width:80ch}article p{margin:18px 0}li{margin:14px 0}code{font-size:.9em;background:#edf2f2;padding:1px 4px;border-radius:3px;overflow-wrap:anywhere}.source{font-size:14px;color:#61747a;border-top:1px solid #dce4e5;padding-top:14px}.table{overflow-x:auto}table{border-collapse:collapse;width:100%}td,th{padding:10px;text-align:left;border-bottom:1px solid #dce4e5;vertical-align:top}footer{margin-top:28px;font-size:14px;color:#61747a}@media(max-width:600px){main{padding:20px 14px 50px}article{padding:0 17px 20px}summary{font-size:19px;padding:16px}ol{padding-left:22px}}
</style></head><body><main><a href="../../bible/#review/character-backgrounds-1">Back to Review</a><h1>Character backgrounds</h1><p>Written proposals for 22 named characters and one separate CCTV concept. Read any person below. Established facts and new history are marked separately.</p><p>Choose the histories you want to keep, or comment on individual characters, in Review. Existing portraits identify the cast; no new artwork or game scenes are being proposed for approval here.</p><nav aria-label="Characters">'''+''.join(nav)+'</nav>'+''.join(parts)+'''<footer>Generated from notes/character-backgrounds/*.md. Those Markdown files are the prose source. This reader does not change the game.</footer></main>
<script>
function reveal(){const id=decodeURIComponent(location.hash.slice(1));const target=document.getElementById(id);if(!target)return;const panel=target.matches('details')?target:target.closest('details');if(panel)panel.open=true;requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));}addEventListener('hashchange',reveal);reveal();
</script></body></html>'''
page+='\n<!-- Source SHA-256: '+json.dumps(hashes,sort_keys=True)+' -->\n';(out/'index.html').write_text(page)
review={'title':'Character backgrounds: full cast','date':'2026-10-07','by':'Codex character-backgrounds','status':'open','question':'Written background proposals, with the full reader linked below. Which histories would you like to keep, and what should change?','multi':True,'options':options,'links':[{'label':'Read all backgrounds and the coverage inventory','href':'reviews/character-backgrounds-1/index.html'}]+links}
existing=json.loads((out/'review.json').read_text()) if (out/'review.json').exists() else {}
for key in ('date','updated','status','issue'):
 if key in existing:review[key]=existing[key]
(out/'review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n')
print('Generated',len(options),'Review cards and',len(parts),'reader sections;',sum(len((src/(i+'.md')).read_text().split()) for i in order),'dossier words')
