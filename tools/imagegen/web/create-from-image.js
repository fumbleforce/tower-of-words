import {api, esc, notice} from '/tools/subplots/web/common.js';
import {openBlockEditor} from '/tools/subplots/web/block-editor.js';

export function installCreateFromImage({onCharacterCreated} = {}) {
  async function character(image) {
    const [record, presets, mode] = await Promise.all([
      api('image/api/render/' + encodeURIComponent(image.id)), api('image/api/presets'), api('image/api/mode'),
    ]);
    const ids = record.characters || record.compose?.characters || [];
    const person = ids.length === 1 ? presets.character?.find(p => p.id === ids[0]) : null;
    const local = record.compose?.people?.[ids[0]] || {};
    const appearance = Object.hasOwn(local, 'appearance') ? {look: local.appearance}
      : Object.fromEntries(['look', 'age', 'signature', 'build', 'short'].map(key => [key, person?.data[key] || '']));
    return openBlockEditor({kind: 'character', from: '', presets, privateMode: mode.private, private: record.private,
      prefill: {...appearance, portrait: record.url, gender: person?.data.gender || '',
        outfit: local.clothing ?? person?.data.outfit ?? '', negative: local.appearanceNegative ?? person?.data.negative ?? ''},
      portraitUrl: () => record.url, portraitLocked: true,
      create: request => api('image/api/character-from-image', {...request, imageId: record.id}),
      onDone: id => { notice('Character created. It is available in People in both image editors.'); onCharacterCreated?.(id); },
    });
  }

  async function scene(image) {
    const record = await api('image/api/render/' + encodeURIComponent(image.id));
    let dialog = globalThis.document.getElementById('createSceneFromImage');
    if (!dialog) {
      dialog = globalThis.document.createElement('dialog');
      dialog.id = 'createSceneFromImage'; dialog.className = 'block-dialog';
      globalThis.document.body.append(dialog);
    }
    dialog.innerHTML = `<form class="block-form"><div class="block-head"><h3>Create scene</h3><button type="button" data-close>Close</button></div>
      <img class="scene-source-preview" src="${esc(record.url)}" alt="Selected picture">
      <label>Scene name<input name="title" required maxlength="120" autocomplete="off" placeholder="Give this scene a name"></label>
      <p class="hint">Starts a saved scene draft with this picture and its generation settings. Continue writing in the scene editor.</p>
      <p class="hint">${record.private ? 'Private scene draft.' : 'General scene draft.'} It is kept in your local scene library.</p>
      <p data-error role="alert" hidden></p><div class="block-actions"><button type="button" data-close>Cancel</button><button type="submit" class="primary">Create scene</button></div></form>`;
    dialog.querySelectorAll('[data-close]').forEach(b => b.onclick = () => dialog.close());
    dialog.querySelector('form').onsubmit = async e => {
      e.preventDefault();
      const button = e.submitter, error = dialog.querySelector('[data-error]');
      button.disabled = true; error.hidden = true;
      try {
        const result = await api('create-from-image', {imageId: record.id, title: dialog.querySelector('[name=title]').value});
        const url = 'http://127.0.0.1:8771/tools/subplots/web/#' + encodeURIComponent(result.id);
        dialog.innerHTML = `<div class="block-form"><h3>Scene created</h3><p>Your picture and generation settings are saved in the new draft.</p><div class="block-actions"><button type="button" data-close>Keep generating</button><a class="button primary" href="${esc(url)}">Open scene editor</a></div></div>`;
        dialog.querySelector('[data-close]').onclick = () => dialog.close();
        dialog.querySelector('a').focus();
        notice('Scene draft created. Open the scene editor to add dialogue and pictures.');
      } catch (err) { error.textContent = err.message; error.hidden = false; button.disabled = false; }
    };
    dialog.showModal(); dialog.querySelector('[name=title]').focus();
  }
  return {scene, character};
}
