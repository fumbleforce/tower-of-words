"""Make separately labelled sheets from Codex's actual game captures."""
import argparse
from pathlib import Path
from PIL import Image
from sheets import grid


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--label', required=True)
    args = parser.parse_args()
    renders = args.directory / 'renders'
    names = [f'webgl-grounded-forecourt-{size}{crop}.png'
             for size in ('desk', 'phone') for crop in ('', '-crop')]
    missing = [name for name in names if not (renders / name).is_file()]
    if missing:
        raise SystemExit('Missing game captures: ' + ', '.join(missing))
    items = [(name.removeprefix('webgl-grounded-').removesuffix('.png'),
              Image.open(renders / name).convert('RGB')) for name in names]
    sheet = grid(items, 2, (1400, 900), args.label + ': actual game, static grounded poses')
    sheet.save(args.directory / 'sheet-webgl.webp', quality=92)

    earlier = [p for p in sorted(renders.glob('webgl-*.png'))
               if not p.name.startswith('webgl-grounded-') and not p.stem.endswith('-crop')]
    if earlier:
        items = [(p.stem, Image.open(p).convert('RGB')) for p in earlier]
        sheet = grid(items, 2, (1400, 900), args.label + ': earlier actual-game capture attempts')
        sheet.save(args.directory / 'sheet-webgl-history.webp', quality=92)
    print(args.directory / 'sheet-webgl.webp')


if __name__ == '__main__':
    main()
