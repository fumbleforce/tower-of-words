"""Prints one line per image from the round's imgqa reports: status, red rim, glasses, drift (used for the review notes)."""
import json, glob, os
HERE = os.path.dirname(os.path.abspath(__file__))


def table():
    out = {}
    for f in sorted(glob.glob(os.path.join(HERE, 'imgqa-*/imgqa.json'))):
        d = json.load(open(f))
        for r in d['images']:
            n = os.path.basename(r['path']).rsplit('.', 1)[0]
            c = r
            gl = c.get('glasses', {})
            out[n] = {'status': r.get('status'), 'redrim': c['redrim']['value'], 'redrim_status': c['redrim']['status'],
                      'glasses': gl.get('status') if gl.get('cover') is not None else None,
                      'glasses_cover': gl.get('cover'), 'glasses_dE': gl.get('dE'),
                      'ccip': c['drift'].get('ccip'), 'drift_status': c['drift']['status']}
    return out


if __name__ == '__main__':
    for n, v in table().items():
        print(n, v)
