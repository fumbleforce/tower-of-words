import { defaults, parseConfig, storageKey, TINTS } from './config.js';
import { storage } from '../storage.js';

export function attachPanel({ initial, apply, onView, onAnimation, onPause }) {
  let config = structuredClone(initial);
  const message = document.getElementById('config-status');
  const fields = ['expression', 'strength', 'blink', 'headPitch', 'glasses'];
  const notice = (text) => {
    message.textContent = text;
  };
  function store() {
    if (storage.set(storageKey(config.variant), config)) return true;
    notice('Browser storage is unavailable. Download settings to keep your changes.');
    return false;
  }
  function refresh() {
    for (const key of fields) {
      const input = document.getElementById(key);
      if (input.type === 'checkbox') input.checked = config[key];
      else input.value = config[key];
      const output = document.getElementById(key + '-value');
      if (output) output.value = key === 'headPitch' ? config[key] + '°' : Math.round(config[key] * 100) + '%';
    }
    for (const key of TINTS) document.getElementById('tint-' + key).value = config.tints[key];
    document.getElementById('view').value = config.view;
    document.getElementById('animation').value = config.animation;
    document.getElementById('variant').value = config.variant;
    document.getElementById('pause').textContent = config.paused ? 'Play' : 'Pause';
    document.getElementById('glasses').disabled = config.variant === 'base';
    document.getElementById('config-json').value = JSON.stringify(config, null, 2);
  }
  function update() {
    apply(config);
    refresh();
    return store();
  }
  function load(next) {
    if (next.variant !== config.variant) {
      if (!storage.set(storageKey(next.variant), next))
        throw new Error('Browser storage is needed to load settings for another sample. Select that sample first.');
      const url = new URL(location.href);
      url.search = new URLSearchParams({ variant: next.variant });
      location.assign(url);
      return;
    }
    config = next;
    onView(config.view);
    onAnimation(config.animation);
    onPause(config.paused);
    return update();
  }
  for (const key of fields) {
    const input = document.getElementById(key);
    input.addEventListener('input', () => {
      config[key] =
        input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value;
      update();
    });
  }
  for (const key of TINTS)
    document.getElementById('tint-' + key).addEventListener('input', (event) => {
      config.tints[key] = event.target.value;
      update();
    });
  for (const [key, action] of [
    ['view', onView],
    ['animation', onAnimation],
  ])
    document.getElementById(key).addEventListener('change', (event) => {
      config[key] = event.target.value;
      action(config[key]);
      update();
    });
  document.getElementById('variant').addEventListener('change', (event) => {
    const url = new URL(location.href);
    url.search = new URLSearchParams({ variant: event.target.value });
    location.assign(url);
  });
  document.getElementById('pause').onclick = () => {
    config.paused = !config.paused;
    onPause(config.paused);
    update();
  };
  document.getElementById('reset').onclick = () => {
    if (load(defaults(config.variant))) notice('Reset this sample to its original preview settings.');
  };
  document.getElementById('apply-json').onclick = () => {
    try {
      if (load(parseConfig(document.getElementById('config-json').value))) notice('Loaded settings.');
    } catch (error) {
      notice(error.message);
    }
  };
  document.getElementById('load-config').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 16384) throw new Error('Choose a settings JSON file smaller than 16 KB.');
      if (load(parseConfig(await file.text()))) notice('Loaded ' + file.name + '.');
    } catch (error) {
      notice(error.message);
    }
    event.target.value = '';
  });
  document.getElementById('download').onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(config, null, 2) + '\n'], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vrm-' + config.variant + '-settings.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notice('Downloaded settings JSON. The model file is unchanged.');
  };
  document.getElementById('copy').onclick = async () => {
    const text = JSON.stringify(config, null, 2);
    const area = document.getElementById('config-json');
    area.value = text;
    try {
      await navigator.clipboard.writeText(text);
      notice('Copied settings JSON.');
    } catch {
      document.getElementById('json-details').open = true;
      area.focus();
      area.select();
      notice('Copy the selected settings text.');
    }
  };
  refresh();
  apply(config);
  return { getConfig: () => structuredClone(config) };
}
