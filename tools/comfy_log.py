"""Read the settings out of a ComfyUI API workflow, for the image gen dashboard's log (tools/imagegen/agentlog.py).

parse_workflow(wf) -> dict with positive, negative, seed, steps, cfg, sampler, scheduler, model_file, w, h, denoise,
mode ('txt2img', 'img2img' or 'inpaint'), src_image and extras (a short list of LoRA, control and sampling notes).
Missing things come back as None or empty. It reads the dict only and never raises on odd workflows.
"""

SAMPLER_CLASSES = ('KSampler', 'KSamplerAdvanced')


def _node(wf, ref):
    """The node a [id, slot] link points to (None for plain values)."""
    if isinstance(ref, (list, tuple)) and ref and str(ref[0]) in wf:
        return wf[str(ref[0])]
    return None


def _value(wf, v):
    """A plain value, or what a primitive node behind a link holds."""
    n = _node(wf, v)
    if n is None:
        return v
    ins = n.get('inputs', {})
    for k in ('value', 'text', 'string', 'int', 'float'):
        if k in ins and not isinstance(ins[k], (list, tuple)):
            return ins[k]
    return None


def _text(wf, ref, key):
    """The prompt text at the end of a conditioning chain (ControlNet and LLLite nodes sit in between)."""
    seen = 0
    n = _node(wf, ref)
    while n is not None and seen < 12:
        seen += 1
        ins = n.get('inputs', {})
        if str(n.get('class_type', '')).startswith('CLIPTextEncode'):
            for k in ('text', 'text_g', 'prompt'):
                if k in ins:
                    v = _value(wf, ins[k])
                    return v if isinstance(v, str) else ''
            return ''
        n = _node(wf, ins.get(key) or ins.get('conditioning'))
    return ''


def _chain(wf, ref, key):
    """Walk back along input `key` ('model', 'latent_image') and yield every node on the way."""
    n, seen = _node(wf, ref), 0
    while n is not None and seen < 40:
        seen += 1
        yield n
        n = _node(wf, n.get('inputs', {}).get(key))


def _sampler(wf):
    """The sampler that does the main work: highest denoise (a repaint pass counts less than the first full pass)."""
    best = None
    for n in wf.values():
        if n.get('class_type') in SAMPLER_CLASSES:
            d = _value(wf, n['inputs'].get('denoise', 1.0))
            d = d if isinstance(d, (int, float)) else 1.0
            if best is None or d > best[0]:
                best = (d, n)
    return best[1] if best else None


def _extras(wf):
    out = []
    for n in wf.values():
        c, ins = str(n.get('class_type', '')), n.get('inputs', {})
        lc = c.lower()
        if 'lora' in lc and ins.get('lora_name'):
            out.append(f"lora {ins['lora_name']} @ {ins.get('strength_model', ins.get('strength', 1))}")
        elif c == 'ControlNetLoader':
            out.append(f"controlnet {ins.get('control_net_name')}")
        elif c.startswith('ControlNetApply') and 'strength' in ins:
            out.append(f"controlnet strength {_value(wf, ins['strength'])}")
        elif c == 'ModelPatchLoader':
            out.append(f"patch {ins.get('name')}")
        elif 'lllite' in lc:
            out.append(f"lllite strength {_value(wf, ins.get('strength'))} until {_value(wf, ins.get('end_percent'))}")
        elif 'ipadapter' in lc:
            w = _value(wf, ins.get('weight', ins.get('strength')))
            out.append(' '.join(str(x) for x in ('ipadapter', ins.get('ip_adapter_name') or ins.get('ipadapter_file'),
                                                  None if w is None else f'strength {w}') if x))
        elif c.startswith('ModelSampling') and 'shift' in ins:
            out.append(f"{c} shift {ins['shift']}")
    return out


def parse_workflow(wf):
    try:
        wf = {str(k): v for k, v in wf.items() if isinstance(v, dict)}
        ks = _sampler(wf)
        if ks is None:
            return {}
        ins = ks['inputs']
        r = {k: _value(wf, ins.get(k)) for k in ('seed', 'steps', 'cfg', 'denoise')}
        r.update(sampler=ins.get('sampler_name'), scheduler=ins.get('scheduler'),
                 positive=_text(wf, ins.get('positive'), 'positive'), negative=_text(wf, ins.get('negative'), 'negative'))
        r['seed'] = r['seed'] if r['seed'] is not None else _value(wf, ins.get('noise_seed'))
        model = None
        for n in _chain(wf, ins.get('model'), 'model'):
            i = n.get('inputs', {})
            model = model or i.get('unet_name') or i.get('ckpt_name')
        r['model_file'] = model
        r['w'] = r['h'] = None
        for n in wf.values():
            if str(n.get('class_type', '')).startswith('Empty') and 'Latent' in n['class_type'] and 'width' in n['inputs']:
                r['w'], r['h'] = n['inputs']['width'], n['inputs']['height']
        encode = [n for n in wf.values() if str(n.get('class_type', '')).startswith(('VAEEncode', 'SetLatentNoiseMask'))]
        masked = any('Mask' in str(n.get('class_type')) or 'Inpaint' in str(n.get('class_type')) for n in encode)
        r['mode'] = 'inpaint' if masked else 'img2img' if encode else 'txt2img'
        enc = next((n for n in encode if n['class_type'] == 'VAEEncode'), None)
        src = _node(wf, enc['inputs'].get('pixels')) if enc else None
        r['src_image'] = src['inputs'].get('image') if src and src.get('class_type') == 'LoadImage' else None
        r['extras'] = _extras(wf)
        return r
    except Exception:
        return {}
