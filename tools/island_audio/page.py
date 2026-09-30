"""Review page for the island slice audio: legacy/proto2/island-audio/index.html.
Every song take (with a live karaoke overlay of the Whisper timings), every voice take of every line (picked and rejected, with the
checks), the clone references, every sound-effect and ambience candidate (source, licence, prompt, CLAP score) and the music map.
All placeholders until Jørgen picks. Run: python3 tools/island_audio/page.py (after the builds; it only reads their outputs)."""
import json, os, glob, html, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from voices import REPO, W, RAW, LINES, REFS, DESIGN, DESIGN_DIR, TAKES
from sfx_spec import SFX, AMB

OUT = f'{REPO}/legacy/proto2/island-audio'
MEDIA = f'{OUT}/media'
esc = html.escape


def mp3(src, dst, kbps=96, norm=True):
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    af = ['-af', 'loudnorm=I=-18:TP=-2:LRA=11'] if norm else []
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src] + af + ['-ar', '44100', '-c:a', 'libmp3lame', '-b:a', f'{kbps}k', dst], check=True)


def rel(p):
    return os.path.relpath(p, OUT)


def voice_data():
    lines = json.load(open(LINES))['lines']
    metrics = json.load(open(f'{W}/voice/metrics.json')) if os.path.exists(f'{W}/voice/metrics.json') else {}
    idx_p = f'{REPO}/legacy/island/godot/assets/audio/voice/index.json'
    picked = {}
    if os.path.exists(idx_p):
        for fid, e in json.load(open(idx_p))['lines'].items():
            if e.get('voice_item'):
                picked.setdefault(e['voice_item'], e)
    out = []
    for l in lines:
        takes = []
        for wav in sorted(glob.glob(f'{RAW}/{l["id"]}/*.wav')):
            t = os.path.basename(wav)[:-4]
            side = json.load(open(wav[:-4] + '.json')) if os.path.exists(wav[:-4] + '.json') else {}
            m = metrics.get(l['id'], {}).get(t, {})
            media = f'{MEDIA}/voice/{l["id"]}/{t}.mp3'
            if not os.path.exists(media):
                mp3(wav, media, 64)
            takes.append({'take': t, 'engine': side.get('engine'), 'seed': side.get('seed'), 'text': side.get('text'),
                          'ref': side.get('reference'), 'gen_s': side.get('gen_s'), 'device': side.get('device'), 'src': rel(media),
                          'm': {k: m.get(k) for k in ('median_f0', 'low160', 'pitch_ok', 'asr', 'cer', 'read_ok', 'sim', 'dur_ok', 'ok', 'speech', 'short')}})
        p = picked.get(l['id'], {})
        out.append({'id': l['id'], 'speaker': l['speaker'], 'jp': l['jp'], 'reading': l['reading'], 'en': l['en'], 'kind': l['kind'],
                    'tier': l['tier'], 'uses': l['uses'], 'note': l.get('note') or (f'voiced as 「{l["tts"]}」' if l.get('tts') else None),
                    'picked': p.get('take'), 'flag': p.get('flag'),
                    'game': p.get('file'), 'takes': takes})
    return out


def ref_data():
    out = []
    for sp, (ref, text, why) in REFS.items():
        if not os.path.exists(ref):
            continue
        media = f'{MEDIA}/refs/{sp}.mp3'
        mp3(ref, media, 96)
        out.append({'speaker': sp, 'file': ref.replace(REPO + '/', '').replace(os.path.expanduser('~'), '~'), 'text': text, 'why': why, 'src': rel(media)})
    dm = json.load(open(f'{DESIGN_DIR}/metrics.json')) if os.path.exists(f'{DESIGN_DIR}/metrics.json') else {}
    chosen = json.load(open(f'{DESIGN_DIR}/chosen.json')) if os.path.exists(f'{DESIGN_DIR}/chosen.json') else {}
    design = []
    for wav in sorted(glob.glob(f'{DESIGN_DIR}/*.wav')):
        k = os.path.basename(wav)[:-4]
        v = k.split('-')[0]
        side = json.load(open(wav[:-4] + '.json'))
        media = f'{MEDIA}/refs/design/{k}.mp3'
        mp3(wav, media, 96)
        design.append({'id': k, 'voice': v, 'caption': side['caption'], 'text': side['text'], 'seed': side['seed'], 'src': rel(media),
                       'm': dm.get(k, {}), 'chosen': chosen.get(v, {}).get('pick') == k, 'why': chosen.get(v, {}).get('why')})
    return out, design


def song_data():
    log = json.load(open(f'{W}/song/raw/log.json')) if os.path.exists(f'{W}/song/raw/log.json') else {}
    pick = json.load(open(f'{W}/song/pick.json')) if os.path.exists(f'{W}/song/pick.json') else {}
    out = []
    for p in sorted(glob.glob(os.path.expanduser('~/ai/island-audio/song/*/analysis.json'))):
        r = json.load(open(p))
        t = r['take']
        media = {k: f'media/song/{t}-{k}.mp3' for k in ('mix', 'backing', 'vocal')}
        info = log.get(t, {})
        rk = pick.get('ranking_by_checks') or pick.get('ranking') or []
        vname = ''
        if t.startswith('okiro2'):
            vv = t[len('okiro2'):].split('-')[0]
            vsp = json.load(open(os.path.expanduser('~/ai/island-audio/song/v2/versions.json'))).get(vv, {}) if os.path.exists(os.path.expanduser('~/ai/island-audio/song/v2/versions.json')) else {}
            vname = f'Version {vv.upper()}: {vsp.get("title", "")}'
        out.append({'take': t, 'picked': pick.get('picked') == t, 'alt': pick.get('alternative') == t, 'version': vname,
                    'rank': rk.index(t) + 1 if t in rk else None,
                    'settings': info, 'media': media, 'duration': r['duration'], 'bpm': r['bpm_score'], 'tempo': r['tempo_librosa'],
                    'beat0': r['beat0'], 'spb': r['spb'], 'asr': r['asr_text'], 'cer': r['lyric_cer'], 'found': r['lines_found'],
                    'cmd': [r['commands_heard'], r['commands_total']], 'must': [r['must_heard'], r['must_total']],
                    'commands': r['commands'], 'lines': r['lines'], 'score_check': r.get('score_check'), 'relisten': r.get('relisten', []),
                    'heard': r.get('heard_text'), 'score_timing': r.get('score_timing'),
                    'abc': os.path.exists(os.path.expanduser(f'~/ai/island-audio/song/raw/{t}.abc.edit.txt'))})
    out.sort(key=lambda s: (0 if s['version'] else 1, not s['picked'], not s['alt'], s['rank'] or 99, s['take']))
    return out


def sfx_data():
    cands = json.load(open(os.path.expanduser('~/ai/island-audio/sfx/candidates.json'))) if os.path.exists(os.path.expanduser('~/ai/island-audio/sfx/candidates.json')) else {}
    out = []
    for name, e in {**SFX, **AMB}.items():
        cs = cands.get(name, [])
        out.append({'name': name, 'amb': name in AMB, 'desc': e['desc'], 'kind': e['kind'], 'hooks': e['hooks'],
                    'cands': [{k: c.get(k) for k in ('id', 'source', 'url', 'licence', 'prompt', 'settings', 'processing', 'clap', 'picked', 'seconds', 'origin', 'note')}
                              | {'src': f'media/sfx/{c["id"]}.mp3'} for c in cs]})
    return out


def music_data():
    p = f'{REPO}/legacy/island/godot/assets/audio/music/map.json'
    if not os.path.exists(p):
        return {}
    m = json.load(open(p))
    for k, t in m['tracks'].items():
        f = f'{REPO}/legacy/island/godot/assets/audio/music/{k}.ogg'
        if os.path.exists(f):
            mp3(f, f'{MEDIA}/music/{k}.mp3', 128, norm=False)
            t['src'] = f'media/music/{k}.mp3'
    return m


CSS = r"""
:root{--bg:#f5f6f8;--card:#fff;--ink:#15171c;--mute:#4b5260;--line:#dadee4;--acc:#0f7c80;--acc2:#e3f1f1;--warn:#b3261e;--ok:#1f7a3a;--hl:#ffe9a8}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 "Outfit",sans-serif}
main{max-width:1500px;margin:0 auto;padding:28px 16px 90px}h1{margin:0 0 6px;font-size:30px}h2{margin:44px 0 6px;font-size:25px}
h3{margin:26px 0 8px;font-size:20px}p,li{color:var(--mute);max-width:980px}.jp{font-family:"M PLUS 1",sans-serif}
nav.top{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line);padding:8px 0;display:flex;gap:6px;flex-wrap:wrap}
nav.top a,.btn{font:600 14px "Outfit",sans-serif;color:var(--acc);background:var(--card);border:1px solid var(--line);border-radius:999px;padding:5px 12px;text-decoration:none;cursor:pointer}
.btn.on{background:var(--acc);color:#fff;border-color:var(--acc)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(440px,1fr));gap:12px}
@media(max-width:520px){.grid{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.card h4{margin:0 0 2px;font-size:17px;color:var(--acc);word-break:break-all}.card h4 .tag{margin-left:6px}
.tag{display:inline-block;font:600 12px "Outfit",sans-serif;border-radius:4px;padding:1px 6px;background:#eef1f4;color:var(--mute);vertical-align:middle}
.tag.pick{background:var(--acc);color:#fff}.tag.bad{background:#fbe4e2;color:var(--warn)}.tag.good{background:#e2f3e7;color:var(--ok)}
.line-jp{font:500 22px "M PLUS 1",sans-serif;margin:2px 0}.meta{font-size:13.5px;color:var(--mute)}.meta b{color:var(--ink);font-weight:600}
.take{border-top:1px solid var(--line);margin-top:8px;padding-top:8px}.take.picked{background:var(--acc2);margin-left:-14px;margin-right:-14px;padding-left:14px;padding-right:14px}
audio{width:100%;height:36px;display:block;margin:4px 0}
.bad{color:var(--warn)}.good{color:var(--ok)}
details{margin:10px 0}summary{cursor:pointer;font:600 18px "Outfit",sans-serif;padding:6px 0}
table{border-collapse:collapse;width:100%;background:var(--card);border:1px solid var(--line);font-size:14px;margin:10px 0}
th,td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{background:#eef1f4}
.wrap{overflow-x:auto}.search{font:15px "Outfit",sans-serif;padding:6px 10px;border:1px solid var(--line);border-radius:8px;min-width:260px}
.song{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px;margin:0 0 14px}
.song h4{margin:0;font-size:19px;color:var(--acc)}.players{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px;margin:8px 0}
.players label{font-size:13px;color:var(--mute)}
.kara{background:#101418;color:#e8ecef;border-radius:8px;padding:12px 14px;margin-top:8px;max-height:420px;overflow-y:auto}
.kara .ln{font:500 20px/1.7 "M PLUS 1",sans-serif;padding:2px 6px;border-radius:6px;cursor:pointer;color:#8a939b}
.kara .ln.now{background:#1d2630;color:#fff}.kara .ln .t{font:12px "Outfit",sans-serif;color:#6f7a84;margin-right:8px}
.kara .mo.on{color:var(--hl)}.kara .w.cmd{text-decoration:underline;text-decoration-color:#4fb3b6;text-underline-offset:5px}
.kara .ln.miss{opacity:.55}.kara .ln .f{font:12px "Outfit",sans-serif;color:#e39b93;margin-left:8px}
svg.tl{width:100%;height:46px;display:block;margin-top:6px;background:#eef1f4;border-radius:6px}
pre{white-space:pre-wrap;font-size:13px;background:#eef1f4;padding:8px;border-radius:6px}
.hide{display:none!important}
h2,h3,.card,.song{scroll-margin-top:64px}
@media(max-width:620px){nav.top{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}nav.top a{white-space:nowrap}}
"""

JS = r"""
const D = window.DATA;
const $ = (s, e=document) => e.querySelector(s), $$ = (s, e=document) => [...e.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const f = (x, d=2) => x == null ? '–' : (+x).toFixed(d);
// pause every other player when one starts
document.addEventListener('play', e => { $$('audio').forEach(a => { if (a !== e.target) a.pause(); }); }, true);

// ---------- song ----------
function songCard(s) {
  const st = s.settings || {};
  const tags = [s.picked ? '<span class="tag pick">in the build (Jørgen\'s pick)</span>' : '', s.alt ? '<span class="tag pick">the alternative</span>' : '',
                s.version ? `<span class="tag">${esc(s.version)}</span>` : '', st.settings_of ? `<span class="tag">settings of ${esc(st.settings_of)}</span>` : '', s.found < 18 ? '<span class="tag bad">lyrics missing</span>' : '<span class="tag good">all lines sung</span>',
                (st.method || '').startsWith('round 1') ? '<span class="tag bad">cut off at 85 s</span>' : ''].join(' ');
  const must = s.commands.filter(c => c.must && !(s.lines[c.line] || {}).not_sung).map(c => `${c.s} <span class="${c.ok ? 'good' : 'bad'}">${c.ok ? 'heard' : 'not heard'}</span>`).join(', ');
  const el = document.createElement('div'); el.className = 'song'; el.id = s.take;
  el.innerHTML = `<h4>${s.take} ${tags}</h4>
   <div class="meta">${s.rank ? `<b>Rank ${s.rank}</b> by the checks · ` : ''}${f(s.duration,1)} s · score tempo ${s.bpm} BPM (librosa hears ${f(s.tempo,0)}) · lines found <b>${s.found}/20</b> · commands heard <b>${s.cmd[0]}/${s.cmd[1]}</b> · must-hear: ${must} · lyric CER ${f(s.cer)}</div>
   <div class="meta">${[`Tags: ${esc(st.tags)}`, esc(st.checkpoint), `seed ${st.seed}`, esc(st.method || ''), st.trim ? 'trim: ' + esc(st.trim.join('; ')) : '',
      `max_duration ${st.max_duration} s`, esc(st.sampler || '')].filter(x => x).join(' · ')}</div>
   ${st.lyrics_version ? `<details><summary style="font-size:14px">The lyrics as YuE2 got them</summary><pre class="jp">${esc(st.lyrics)}</pre></details>` : ''}
   <div class="players">
     <div><label>Full mix</label><audio preload="none" controls src="${s.media.mix}"></audio></div>
     <div><label>Backing (Demucs, no vocals)</label><audio preload="none" controls src="${s.media.backing}"></audio></div>
     <div><label>Guide vocal (Demucs)</label><audio preload="none" controls src="${s.media.vocal}"></audio></div></div>
   <svg class="tl" viewBox="0 0 1000 46" preserveAspectRatio="none"></svg>
   <div class="kara"></div>
   ${s.score_timing ? `<div class="meta">Kana timings from the score (${esc(s.score_timing.score)}): ${s.score_timing.notes} sung notes for ${s.score_timing.morae} morae, ${s.score_timing.morae_sharing_a_note} morae sharing a note, ${s.score_timing.notes_left_out} notes unused; score-to-audio offset ${s.score_timing.offset_s} s, Whisper's rough times a median ${s.score_timing.fit_median_ms} ms from the notes.</div>` : '<div class="meta">No saved score for this take: the kana timings are Whisper\'s forced alignment.</div>'}
   ${s.score_check ? `<div class="meta">Timing against the score YuE2 rendered: kana starts are a median <b>${s.score_check.median_ms} ms</b> from a note of the score's melody (${Math.round(s.score_check.within_100ms*100)}% within 100 ms; a random time would be ${s.score_check.kana_baseline_ms} ms away).</div>` : ''}
   <details><summary style="font-size:14px">What Whisper heard (free transcription of the vocal stem)</summary><p class="jp">${esc(s.asr)}</p>
   ${s.relisten.length ? '<p>Heard again, gap by gap (a short window hallucinates less): ' + s.relisten.map(r => `${f(r.from,1)}–${f(r.to,1)} s 「<span class="jp">${esc(r.heard)}</span>」 (${r.kept ? 'used' : 'not used: it matched less of the lyrics'})`).join('; ') + '</p>' : ''}</details>`;
  const k = $('.kara', el), svg = $('svg', el), T = s.duration;
  s.lines.forEach(ln => {
    if (ln.not_sung) {  // the take never gets to this line (cut off, or its score ran out)
      const d0 = document.createElement('div'); d0.className = 'ln miss';
      d0.innerHTML = `<span class="t">–</span>${esc(ln.jp)}<span class="f">not sung in this take</span>`; k.appendChild(d0); return; }
    const d = document.createElement('div'); d.className = 'ln' + (ln.found < 0.5 ? ' miss' : ''); d.dataset.s = ln.start; d.dataset.e = ln.end;
    d.innerHTML = `<span class="t">${f(ln.start,1)}</span>` + ln.words.map(w => w.punct ? esc(w.s) :
       `<span class="w${w.catch ? ' cmd' : ''}" title="${esc(w.reading)} ${f(w.start)}–${f(w.end)} s, beat ${w.beat}">` +
       (w.morae.length && [...w.s].length === w.morae.length ? w.morae.map((m, i) => `<span class="mo" data-s="${m.start}" data-e="${m.end}">${esc([...w.s][i])}</span>`).join('')
         : `<span class="mo" data-s="${w.start}" data-e="${w.end}">${esc(w.s)}</span>`) + '</span>').join('') +
       (ln.found < 0.5 ? `<span class="f">not clearly heard (${Math.round(ln.found*100)}% of its kana)</span>` : '');
    d.onclick = () => { const a = $$('audio', el).find(a => !a.paused) || $('audio', el); a.currentTime = Math.max(0, ln.start - 0.3); a.play(); };
    k.appendChild(d);
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', ln.start / T * 1000); r.setAttribute('width', Math.max(2, (ln.end - ln.start) / T * 1000)); r.setAttribute('y', 8); r.setAttribute('height', 22);
    r.setAttribute('fill', ln.found < 0.5 ? '#e7b1ab' : '#7fc2c4'); svg.appendChild(r);
  });
  for (let b = s.beat0, i = 0; b < T; b += s.spb, i++) { if (i % 4) continue; const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', b / T * 1000); l.setAttribute('x2', b / T * 1000); l.setAttribute('y1', 34); l.setAttribute('y2', 44); l.setAttribute('stroke', '#9aa3ad'); svg.appendChild(l); }
  s.commands.filter(c => !(s.lines[c.line] || {}).not_sung).forEach(c => { const e = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); e.setAttribute('cx', c.start / T * 1000); e.setAttribute('cy', 19); e.setAttribute('r', 3.5);
    e.setAttribute('fill', c.ok ? '#0f7c80' : '#b3261e'); svg.appendChild(e); });
  const ph = document.createElementNS('http://www.w3.org/2000/svg', 'line'); ph.setAttribute('y1', 0); ph.setAttribute('y2', 46); ph.setAttribute('stroke', '#15171c'); ph.setAttribute('stroke-width', 2); svg.appendChild(ph);
  svg.onclick = ev => { const r = svg.getBoundingClientRect(); const a = $$('audio', el).find(a => !a.paused) || $('audio', el); a.currentTime = (ev.clientX - r.left) / r.width * T; a.play(); };
  let raf;
  const tick = () => { const a = $$('audio', el).find(a => !a.paused); if (!a) return; const t = a.currentTime;
    ph.setAttribute('x1', t / T * 1000); ph.setAttribute('x2', t / T * 1000);
    $$('.mo', el).forEach(m => m.classList.toggle('on', +m.dataset.s <= t));
    let cur = null; $$('.ln', el).forEach(l => { const on = +l.dataset.s - 0.25 <= t && t <= +l.dataset.e + 0.25; l.classList.toggle('now', on); if (on) cur = l; });
    if (cur && k.dataset.cur !== cur.dataset.s) { k.dataset.cur = cur.dataset.s; k.scrollTo({top: cur.offsetTop - k.offsetTop - 60, behavior: 'smooth'}); }
    raf = requestAnimationFrame(tick); };
  $$('audio', el).forEach(a => a.addEventListener('play', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }));
  return el;
}

// ---------- voices ----------
function takeHtml(l, t) {
  const m = t.m || {}, ok = m.ok;
  const checks = m.ok == null ? 'checks pending' : [
    m.pitch_ok === false ? `<span class="bad">pitch guard: median ${m.median_f0} Hz, ${Math.round((m.low160||0)*100)}% under 160 Hz</span>` : `pitch ${m.median_f0 ?? '–'} Hz`,
    `heard 「<span class="jp">${esc(m.asr)}</span>」 <span class="${m.read_ok ? '' : 'bad'}">kana CER ${f(m.cer)}</span>${m.short ? ' (too short to judge)' : ''}`,
    `speaker similarity ${f(m.sim, 3)}`, m.dur_ok === false ? `<span class="bad">length off (${m.speech} s)</span>` : `${f(m.speech)} s`].join(' · ');
  return `<div class="take${l.picked === t.take ? ' picked' : ''}"><div class="meta"><b>${l.id}/${t.take}</b> ${l.picked === t.take ? '<span class="tag pick">in the build</span>' : ''}
    ${m.ok == null ? '<span class="tag">not checked yet</span>' : ok ? '<span class="tag good">passes</span>' : '<span class="tag bad">fails a check</span>'}</div>
    <audio preload="none" controls src="${t.src}"></audio>
    <div class="meta">${esc(t.engine)}, seed ${t.seed}, reference ${esc(t.ref)}${t.gen_s ? `, ${t.gen_s} s on ${t.device}` : ''} · text sent: <span class="jp">${esc(t.text)}</span></div>
    <div class="meta">${checks}</div></div>`;
}
function lineCard(l) {
  const el = document.createElement('div'); el.className = 'card'; el.id = l.id;
  el.dataset.speaker = l.speaker; el.dataset.tier = l.tier; el.dataset.flag = l.flag ? 1 : 0; el.dataset.q = (l.id + ' ' + l.jp + ' ' + l.reading + ' ' + l.en).toLowerCase();
  const uses = l.uses.map(u => `${esc(u.where)} (${esc(u.who)}${u.id ? ', script id <b>' + esc(u.id) + '</b>' : ''})`).join(', ');
  el.innerHTML = `<h4>${l.id} ${l.tier === 'variant' ? '<span class="tag">level variant</span>' : ''} ${l.kind !== 'line' ? `<span class="tag">${l.kind}</span>` : ''} ${l.flag ? '<span class="tag bad">flagged</span>' : ''}</h4>
    <div class="line-jp">${esc(l.jp)}</div><div class="meta"><span class="jp">${esc(l.reading)}</span> · ${esc(l.en)}</div>
    <div class="meta">Used in: ${uses}${l.note ? ' · ' + esc(l.note) : ''}</div>${l.flag ? `<div class="meta bad">${esc(l.flag)}</div>` : ''}
    ${l.takes.length ? l.takes.map(t => takeHtml(l, t)).join('') : '<div class="meta bad">no takes yet</div>'}`;
  return el;
}

// ---------- effects ----------
function sfxCard(s) {
  const el = document.createElement('div'); el.className = 'card'; el.id = 'sfx-' + s.name;
  el.innerHTML = `<h4>${s.name} <span class="tag">${s.kind}</span></h4><div class="meta">${esc(s.desc)}${s.hooks.length ? ` · replaces the builder's placeholder <b>${s.hooks.join(', ')}</b>` : ''}</div>` +
    (s.cands.length ? s.cands.map(c => `<div class="take${c.picked ? ' picked' : ''}"><div class="meta"><b>${c.id}</b> ${c.picked ? '<span class="tag pick">in the build</span>' : ''} · CLAP ${f(c.clap, 3)} · ${f(c.seconds)} s</div>
      <audio preload="none" controls ${s.kind === 'loop' ? 'loop' : ''} src="${c.src}"></audio>
      <div class="meta">${esc(c.source)}${c.url ? ` (<a href="${c.url}">${c.url.replace('https://','')}</a>)` : ''} · ${esc(c.licence)}</div>
      ${c.prompt ? `<div class="meta">Prompt: ${esc(c.prompt)} · ${esc(c.settings)}</div>` : ''}${c.processing ? `<div class="meta">${esc(c.processing)}</div>` : ''}
      ${c.note ? `<div class="meta"><b>Why this one:</b> ${esc(c.note)}</div>` : ''}</div>`).join('')
      : '<div class="meta bad">no candidates yet</div>');
  return el;
}

function init() {
  const sw = $('#songs'), sw1 = $('#songs-v1');
  D.songs.forEach(s => (s.version ? sw : sw1).appendChild(songCard(s)));
  if (!D.songs.some(s => s.version)) sw.innerHTML = '<p>The takes of the new lyrics are being made.</p>';
  // references
  $('#refs').innerHTML = D.refs.map(r => `<div class="card"><h4>ref-${r.speaker}</h4><audio preload="none" controls src="${r.src}"></audio>
     <div class="meta">${esc(r.file)} · ${esc(r.why)}</div><div class="meta jp">${esc(r.text)}</div></div>`).join('');
  $('#design').innerHTML = D.design.map(d => `<div class="card"><h4>${d.id} ${d.chosen ? '<span class="tag pick">chosen reference</span>' : ''}</h4>
     <audio preload="none" controls src="${d.src}"></audio><div class="meta">Caption: <span class="jp">${esc(d.caption)}</span> · seed ${d.seed}</div>
     <div class="meta">Heard 「<span class="jp">${esc(d.m.asr)}</span>」 · kana CER ${f(d.m.cer)} · pitch ${d.m.median_f0 ?? '–'} Hz</div>${d.why && d.chosen ? `<div class="meta">${esc(d.why)}</div>` : ''}</div>`).join('');
  // voices, grouped by speaker
  const vw = $('#voices'); const order = ['emi', 'mio', 'rei', 'ishibashi', 'player', 'staff', 'salaryman', 'sales', 'lift', 'vending'];
  const bySp = {}; D.voices.forEach(l => (bySp[l.speaker] ||= []).push(l));
  Object.keys(bySp).sort((a, b) => order.indexOf(a) - order.indexOf(b)).forEach(sp => {
    const ls = bySp[sp], fl = ls.filter(l => l.flag).length;
    const d = document.createElement('details'); d.open = false; d.dataset.speaker = sp;
    d.innerHTML = `<summary>${sp} · ${ls.length} lines${fl ? ` · <span class="bad">${fl} flagged</span>` : ''}</summary><div class="grid"></div>`;
    ls.forEach(l => $('.grid', d).appendChild(lineCard(l))); vw.appendChild(d);
  });
  const filt = () => { const q = $('#q').value.toLowerCase(), mode = $('.btn.on[data-f]').dataset.f;
    $$('#voices .card').forEach(c => { const show = (!q || c.dataset.q.includes(q)) && (mode === 'all' || (mode === 'flag' && c.dataset.flag === '1') || (mode === 'main' && c.dataset.tier === 'main') || (mode === 'variant' && c.dataset.tier === 'variant'));
      c.classList.toggle('hide', !show); });
    if (q || mode === 'flag') $$('#voices details').forEach(d => d.open = true); };
  $('#q').oninput = filt; $$('.btn[data-f]').forEach(b => b.onclick = () => { $$('.btn[data-f]').forEach(x => x.classList.remove('on')); b.classList.add('on'); filt(); });
  // effects
  const ew = $('#sfx'), aw = $('#amb'); D.sfx.forEach(s => (s.amb ? aw : ew).appendChild(sfxCard(s)));
  // music
  const m = D.music; if (m.tracks) {
    $('#tracks').innerHTML = Object.entries(m.tracks).map(([k, t]) => `<div class="card"><h4>music-${k}</h4>${t.src ? `<audio preload="none" controls src="${t.src}"></audio>` : '<div class="meta">made with the song (the chorus, faded)</div>'}<div class="meta">${esc(t.desc)}</div></div>`).join('');
    $('#map').innerHTML = '<tr><th>Beat</th><th>Where</th><th>Track</th><th>Volume</th><th>Why</th></tr>' + m.scenes.map(s => `<tr><td>${esc(s.beat)}</td><td>${esc(s.where)}</td><td>${s.track ? 'music-' + s.track : 'none'}</td><td>${s.volume_db} dB</td><td>${esc(s.why)}</td></tr>`).join('');
  }
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) { const d = t.closest('details'); if (d) d.open = true; t.scrollIntoView(); } }
}
init();
"""


def main():
    data = {'voices': voice_data(), 'songs': song_data(), 'sfx': sfx_data(), 'music': music_data()}
    data['refs'], data['design'] = ref_data()
    nv = len(data['voices']); nt = sum(len(l['takes']) for l in data['voices']); nf = sum(1 for l in data['voices'] if l['flag'])
    nc = sum(len(s['cands']) for s in data['sfx'])
    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Island audio review</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=M+PLUS+1:wght@400;500;700&family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body><main>
<h1>Island slice audio: placeholders</h1>
<p>Everything here is a placeholder made locally while you were away, and none of it is approved. The build uses the take marked "in the build" for each item until you pick another. Each take has an ID you can name (for example <b>okiro-d2</b>, <b>emi-a-kita-acf6/iro-s2</b>, <b>lift_chime.sa3-3000</b>). I can't hear audio: the picks come from measurements (Whisper, pitch, speaker similarity, CLAP), so please judge by ear.</p>
<nav class="top"><a href="#song">Song</a><a href="#voices-h">Voices ({nv} lines, {nt} takes, {nf} flagged)</a><a href="#refs-h">Voice references</a><a href="#sfx-h">Effects</a><a href="#amb-h">Ambience</a><a href="#music-h">Music map</a></nav>

<h2 id="song">The karaoke song 「起きろ！」</h2>
<p>YuE2 takes of the lyrics in legacy/island/content/lyrics.md, the setup that made the opening theme (int8 checkpoint, vocals on). Round 1 (a1, a2) was cut off at 85 s: the model's own score for these lyrics runs about 190 s. Round 2 writes the score first, trims the long intro, the interlude and the outro, and renders exactly that. Each take is split by Demucs into a backing track and a guide vocal. YuE2 writes a score before it sings and the audio follows it, so the kana timings come from the score (each mora on a sung note, fitted to Whisper large-v3-turbo's rough timings of the vocal); Whisper also says which lines and commands can be heard. Press play on any of the three players and the lyrics light up by kana; click a line or the timeline to jump. On the timeline, bars are the sung lines (red: not clearly heard), dots are the commands (red: Whisper didn't hear them), ticks are bars of the score's tempo.</p>
<h3>New lyrics (legacy/island/content/lyrics_v2.md): version A, the first morning, and version B, the stopped town</h3>
<p>Each version with the settings of the two takes you liked: okiro-a1's tags, checkpoint and seed, and okiro-e1's. The score is written first and only its instrumental bars are shortened, so every sung bar stays (okiro-e1 lost its last chorus to my first trim, which cut its outro to four bars without looking for sung notes). When a seed's score has too few notes for all twenty lines, the next seeds are tried with the same settings and the first score with room for every line is rendered too.</p>
<div id="songs"></div>
<h3>First lyrics (lyrics.md)</h3>
<p>okiro-a1 is in the game now and okiro-e1 is the alternative, as you picked. The rest are the other takes, ranked by the Whisper checks.</p>
<div id="songs-v1"></div>

<h2 id="voices-h">Voices</h2>
<p>Every scripted line in storyboard.md and gates.md, plus the level variants in variants.md, voiced locally: Irodori-TTS v4.1 Small (two seeds on the line as written, one on the kana reading) and Qwen3-TTS 1.7B, each cloned from the character's reference (below). Checks per take: the GUIDE pitch guard (Mio under 190 Hz median or over 10% under 160 Hz fails; other women 185 Hz and 25%), Whisper large-v3-turbo reading the take back (kana CER against the reading), WavLM speaker similarity to the reference, and length. The pick passes every check with the fewest misread kana, then the closest voice. In the build, loudness is normalised per character (-18 LUFS, the player -23, recorded building voices -20); here every take is at -18 so you can compare.</p>
<p><input id="q" class="search" placeholder="Search id, Japanese or English"> <span class="btn on" data-f="all">All</span> <span class="btn" data-f="flag">Flagged</span> <span class="btn" data-f="main">Script lines</span> <span class="btn" data-f="variant">Level variants</span></p>
<div id="voices"></div>

<h2 id="refs-h">Voice references</h2>
<p>The clips each voice is cloned from. Emi, Rei and the player are built from their lines in the old game (tools/island_audio/refs.py); Mio and Ishibashi use the approved references in tools/voice-refs; the lift reuses the monorail announcer. The office worker, the karaoke staff member, the voice from the Sales room and the vending machine had no earlier voice, so they were designed from a caption with Irodori and the chosen candidate became the reference.</p>
<div class="grid" id="refs"></div><h3>Designed voices (every candidate)</h3><div class="grid" id="design"></div>

<h2 id="sfx-h">Sound effects</h2>
<p>{nc} candidates in all, effects and ambience. Kenney's packs are CC0; Stable Audio 3 Medium ran locally (two seeds per prompt). Each candidate is trimmed and levelled, loops are crossfaded into themselves, and footsteps are cut into single steps (played here as a short walk). CLAP (laion/larger_clap_general) scores how well each one matches its description, and the best score goes in the build.</p>
<div class="grid" id="sfx"></div>
<h2 id="amb-h">Ambience beds</h2><div class="grid" id="amb"></div>
<h2 id="music-h">Music map</h2>
<p>No new music: the old game's Lyria loops and the opening theme, mapped to the slice's beats. The wake-up sting at N07 is cut from the karaoke chorus in the build.</p>
<div class="grid" id="tracks"></div><div class="wrap"><table id="map"></table></div>
</main>
<script>window.DATA = {json.dumps(data, ensure_ascii=False)};</script>
<script>{JS}</script></body></html>"""
    open(f'{OUT}/index.html', 'w').write(page)
    print('page written:', nv, 'lines,', nt, 'takes,', len(data['songs']), 'song takes,', nc, 'effect candidates;', round(len(page) / 1e6, 2), 'MB')


if __name__ == '__main__':
    main()
