"""Main character options: ten directions, 2 seeds each, RDBT (batch M)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from production import run, Q, N, FRAME, RDBT
NORD = 'fair pale skin, light eyebrows, no blush'
OPTS = {
    '01-nordic-newhire': ('1boy', f'a 29-year-old Nordic man, messy sandy-blond hair, light blond eyebrows, {NORD}, blue eyes, slim average build, white shirt with rolled sleeves, company lanyard, friendly slightly nervous smile'),
    '02-it-guy': ('1boy', f'a tired 34-year-old Scandinavian IT guy, short dark-blond hair and a short dark-blond beard, {NORD}, glasses with clear lenses, grey hoodie under a navy blazer, company lanyard, weary half-smile'),
    '03-dutch-grad': ('1boy', 'a lanky 26-year-old Dutch graduate, curly red hair, freckles, fair skin, no blush, light green shirt with rolled sleeves, a backpack over one shoulder, eager grin'),
    '04-kiwi-rugby': ('1boy', 'a broad-shouldered 31-year-old ex-rugby player from New Zealand, buzzcut, a small scar through one eyebrow, friendly face, tight navy polo shirt, company lanyard, easy grin'),
    '05-designer': ('1boy', f'a sharp 28-year-old Norwegian designer, blond undercut swept back, {NORD}, a silver ear cuff, black turtleneck under a long charcoal coat, cool confident look'),
    '06-half-japanese': ('1boy', 'a 30-year-old half-Japanese, half-Nordic man, dark hair, light grey-blue eyes, fair skin, no blush, white shirt and company lanyard, awkward apologetic smile'),
    '07-heterochromia': ('1boy', 'a 27-year-old man with messy white hair, heterochromia with one ice-blue eye and one amber eye, the irises glowing faintly, a thin scar across one cheek, pale skin, no blush, a dark high-collar coat, calm unreadable look'),
    '08-kanji-tattoos': ('1boy', 'a 29-year-old man with ink-black hair tied back in a short ponytail, pale skin, no blush, a rumpled grey suit with the sleeves pushed up, faint glowing cyan kanji tattoos on both forearms, tired sardonic smile'),
    '09-nordic-woman': ('1girl', f'a 28-year-old Nordic woman, strawberry-blonde bob, freckles, {NORD}, blue eyes, fitted navy blazer over a white blouse, company lanyard, friendly determined smile'),
    '10-ex-chef': ('1boy', 'a 40-year-old Swedish ex-chef starting over, salt-and-pepper hair and beard, fair skin, no blush, warm crinkly eyes, a brown knit cardigan over a white t-shirt, company lanyard, kind smile'),
}
for k, (tags, desc) in OPTS.items():
    for seed in (601, 602):
        run('M', f'{k}-{seed}', f'{Q}, safe, {tags}, solo, adult, {desc}, {FRAME}', N, 896, 1152, seed, RDBT)
