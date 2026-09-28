// Live2D-style puppet from one sprite: WebGL warp (breathing, head tilt, hair sway) plus swapped eye and mouth patches.
// Assets in puppet/: base.webp, rig.png (R: loose strands, G: bun, B: head weights), eyes-*.png and mouth-*.png patches.
(function () {
  const W = 896, H = 1152;
  const EYES = [278, 258, 236, 126];   // x, y, w, h of the eye patch in the sprite
  const MOUTH = [355, 395, 100, 70];

  function load(src) {
    return new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
  }

  async function init(root) {
    const canvas = root.querySelector('canvas');
    const dir = root.dataset.dir;
    const gl = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false });
    const names = ['base.webp', 'rig.png', 'eyes-open.png', 'eyes-half.png', 'eyes-closed.png', 'mouth-closed.png', 'mouth-small.png', 'mouth-open.png'];
    let imgs;
    try { imgs = await Promise.all(names.map(n => load(dir + n))); } catch (e) { root.classList.add('failed'); return; }
    const [base, rigImg, ...patches] = imgs;
    const P = { eyes: { open: patches[0], half: patches[1], closed: patches[2] }, mouth: { closed: patches[3], small: patches[4], open: patches[5] } };
    if (!gl) { root.classList.add('failed'); return; }

    const vs = 'attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}';
    const fs = `precision mediump float;
uniform sampler2D img, rig; uniform float breath, aL, aB, aH; varying vec2 v;
const vec2 S = vec2(${W}.,${H}.);
vec2 rot(vec2 p, vec2 c, float a){ vec2 d=p-c; float s=sin(a), k=cos(a); return c+vec2(k*d.x-s*d.y, s*d.x+k*d.y); }
void main(){
  vec2 p = v*S;
  vec2 anchor = vec2(448., 1152.);
  p = anchor + (p-anchor)/vec2(1.+.0022*breath, 1.+.0045*breath);
  vec3 w = texture2D(rig, p/S).rgb;
  p = rot(p, vec2(430.,500.), -aH*w.b);
  p = rot(p, vec2(270.,240.), -aL*w.r);
  p = rot(p, vec2(585.,225.), -aB*w.g);
  gl_FragColor = texture2D(img, clamp(p/S, 0., 1.));
}`;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { root.classList.add('failed'); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    function tex(unit, im) {
      const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
      return t;
    }
    tex(1, rigImg); tex(0, base);
    gl.uniform1i(gl.getUniformLocation(prog, 'img'), 0); gl.uniform1i(gl.getUniformLocation(prog, 'rig'), 1);
    const U = n => gl.getUniformLocation(prog, n);
    const uBreath = U('breath'), uL = U('aL'), uB = U('aB'), uH = U('aH');

    const shown = { eyes: 'open', mouth: 'closed' };
    function setPatch(part, key) {
      if (shown[part] === key) return;
      shown[part] = key;
      const r = part === 'eyes' ? EYES : MOUTH;
      gl.activeTexture(gl.TEXTURE0);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, r[0], r[1], gl.RGBA, gl.UNSIGNED_BYTE, P[part][key]);
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.min(Math.round(canvas.clientWidth * dpr), W);
      if (canvas.width !== w) { canvas.width = w; canvas.height = Math.round(w * H / W); }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    const on = { blink: true, breath: true, hair: true, head: true };
    root.querySelectorAll('input[data-fx]').forEach(el => el.addEventListener('change', () => { on[el.dataset.fx] = el.checked; }));

    // blinking: random gaps of 2-6 s, sometimes a double blink
    let nextBlink = performance.now() + 1500, blinkT0 = -1;
    const BLINK = [[0, 'half'], [45, 'closed'], [135, 'half'], [190, 'open']];
    function blink(now) {
      if (!on.blink) { setPatch('eyes', 'open'); return; }
      if (blinkT0 < 0 && now > nextBlink) blinkT0 = now;
      if (blinkT0 >= 0) {
        const dt = now - blinkT0;
        let key = 'open';
        for (const [t, k] of BLINK) if (dt >= t) key = k;
        setPatch('eyes', key);
        if (dt > 190) {
          blinkT0 = -1;
          nextBlink = now + (Math.random() < 0.15 ? 180 : 2000 + Math.random() * 4000);
        }
      }
    }

    // mouth: loudness of the playing line, with hysteresis and a minimum hold per shape
    const audio = root.querySelector('audio');
    let ctx, analyser, data, level = 0, mouthT = 0;
    function audioSetup() {
      if (ctx) return;
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaElementSource(audio);
      analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
      src.connect(analyser); analyser.connect(ctx.destination);
      data = new Uint8Array(analyser.fftSize);
    }
    function mouth(now) {
      if (!analyser || audio.paused) { level = 0; setPatch('mouth', 'closed'); return 0; }
      analyser.getByteTimeDomainData(data);
      let s = 0;
      for (let i = 0; i < data.length; i++) { const d = (data[i] - 128) / 128; s += d * d; }
      const rms = Math.sqrt(s / data.length);
      level = rms > level ? level * 0.4 + rms * 0.6 : level * 0.75 + rms * 0.25;
      if (now - mouthT > 70) {
        const cur = shown.mouth;
        let key = cur;
        if (level > 0.11) key = 'open';
        else if (level > 0.045) key = cur === 'open' && level > 0.08 ? 'open' : 'small';
        else if (level < 0.03) key = 'closed';
        if (key !== cur) { setPatch('mouth', key); mouthT = now; }
      }
      return level;
    }
    root.querySelectorAll('button[data-src]').forEach(b => b.addEventListener('click', () => {
      audioSetup(); ctx.resume();
      audio.src = b.dataset.src; audio.currentTime = 0; audio.play();
    }));

    let talk = 0;
    function frame(now) {
      const t = now / 1000;
      const force = root.puppet && root.puppet.force;
      if (force) { setPatch('eyes', force.eyes); setPatch('mouth', force.mouth); } else blink(now);
      const lv = force ? 0 : mouth(now);
      talk = talk * 0.92 + Math.min(lv * 6, 1) * 0.08;
      const breath = on.breath ? (Math.sin(t * 2 * Math.PI / 4.2) * 0.5 + 0.5) : 0;
      const head = on.head ? 0.006 * Math.sin(t * 2 * Math.PI / 7.3) + 0.003 * Math.sin(t * 2 * Math.PI / 3.1 + 1) + talk * 0.006 * Math.sin(t * 9) : 0;
      // hair follows the head with a lag, plus a slow drift
      const hair = on.hair ? 1 : 0;
      const aL = hair * (0.035 * Math.sin(t * 2 * Math.PI / 3.6 + 0.6) + 0.012 * Math.sin(t * 2 * Math.PI / 1.7) + head * 2.5);
      const aB = hair * (0.03 * Math.sin(t * 2 * Math.PI / 4.4 + 2.0) + 0.01 * Math.sin(t * 2 * Math.PI / 2.1 + 0.3) + head * 2.0);
      gl.uniform1f(uBreath, breath); gl.uniform1f(uH, head); gl.uniform1f(uL, aL); gl.uniform1f(uB, aB);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(frame);
    }
    root.classList.add('ready');
    root.puppet = { on, force: null };  // force = {eyes, mouth} pins a state (used for checking frames)
    requestAnimationFrame(frame);
  }

  document.querySelectorAll('.puppet').forEach(init);
})();
