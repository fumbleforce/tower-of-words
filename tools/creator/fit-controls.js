// Edits the existing per-slot recipe fit; the builder owns the actual geometry.
export function createFitControls(container, recipe, onChange) {
  container.innerHTML = `
    <summary>Adjust part fit</summary>
    <fieldset disabled>
      <label for="fit-part">Part</label>
      <select id="fit-part">
        <option value="hair">Hair</option><option value="top">Top</option>
        <option value="bottom">Bottom</option><option value="shoes">Shoes</option>
      </select>
      <label for="fit-scale">Size (%)</label>
      <input id="fit-scale" type="number" min="5" max="500" step="any" value="100" required>
      <label for="fit-x">Sideways (X)</label>
      <input id="fit-x" type="number" min="-3" max="3" step="any" value="0" required>
      <label for="fit-y">Up / down (Y)</label>
      <input id="fit-y" type="number" min="-3" max="3" step="any" value="0" required>
      <label for="fit-z">Front / back (Z)</label>
      <input id="fit-z" type="number" min="-3" max="3" step="any" value="0" required>
      <button type="button" id="fit-reset">Reset this part</button>
    </fieldset>
    <p class="note">Adjustments start from the automatic fit and are saved in your recipe. Try small position changes, such as 0.01. Check both Idle and Walk.</p>`;
  const fieldset = container.querySelector('fieldset');
  const part = container.querySelector('#fit-part');
  const inputs = ['scale', 'x', 'y', 'z'].map(id => container.querySelector('#fit-' + id));
  function sync() {
    const fit = recipe.fit?.[part.value] || {};
    const values = [(fit.scale ?? 1) * 100, ...(fit.offset || [0, 0, 0])];
    inputs.forEach((input, i) => { input.value = String(values[i]); });
  }
  function update() {
    if (!inputs.every(input => input.reportValidity())) return;
    recipe.fit ||= {};
    recipe.fit[part.value] = {
      scale: inputs[0].valueAsNumber / 100,
      offset: inputs.slice(1).map(input => input.valueAsNumber),
    };
    onChange();
  }
  part.onchange = sync;
  inputs.forEach(input => { input.onchange = update; });
  container.querySelector('#fit-reset').onclick = () => {
    if (recipe.fit) {
      delete recipe.fit[part.value];
      if (!Object.keys(recipe.fit).length) delete recipe.fit;
    }
    sync();
    onChange();
  };
  sync();
  return { sync, setDisabled(disabled) { fieldset.disabled = disabled; } };
}
