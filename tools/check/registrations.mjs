// CPU validation of the actual factories and their main.js bindings against declarations.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inspectPlaceSource, parseModule } from '../lib/place-source.mjs';
import { PLACE_FILES } from '../../game3d/js/places/definitions.js';
import { PLACE_DETAILS } from '../../game3d/js/places/catalog.js';

export function checkRegistrations(read = file => fs.readFileSync(new URL('../../' + file, import.meta.url), 'utf8')) {
  const factories = {};
  for (const [name, file] of Object.entries(PLACE_FILES)) {
    const actual = inspectPlaceSource(read(file));
    factories[name] = actual.factory;
    for (const [field, keys] of Object.entries(actual.registrations)) {
      const expected = field === 'things' ? Object.keys(PLACE_DETAILS[name].things) : PLACE_DETAILS[name][field];
      assert.deepEqual(keys, expected, `${name}.${field}: factory registrations differ from declarations`);
    }
    assert.deepEqual(Object.keys(actual.things), actual.registrations.things, `${name}.things: incomplete metadata inspection`);
    for (const [id, thing] of Object.entries(actual.things)) {
      assert.deepEqual(thing.metadata, [['PLACE_DETAILS', name, 'things', id]], `${name}.things.${id}: wrong metadata`);
      assert.deepEqual(thing.overrides, [], `${name}.things.${id}: overrides declared metadata`);
    }
  }
  const main = parseModule(read('game3d/js/main.js'));
  const imports = new Map(main.body.filter(node => node.type === 'ImportDeclaration').flatMap(node =>
    node.specifiers.map(specifier => [specifier.local.name, { source: new URL(node.source.value, 'file:///game3d/js/main.js').pathname.slice(1),
      imported: specifier.imported?.name }])));
  const places = main.body.filter(node => node.type === 'VariableDeclaration').flatMap(node => node.declarations)
    .find(node => node.id.name === 'PLACES')?.init;
  assert.equal(places?.type, 'ObjectExpression', 'main must register its place factories explicitly');
  const bindings = Object.fromEntries(places.properties.map(property => {
    assert.equal(property.type, 'Property');
    assert.equal(property.computed, false);
    assert.equal(property.value.type, 'Identifier');
    return [property.key.name ?? property.key.value, imports.get(property.value.name)];
  }));
  assert.deepEqual(bindings, Object.fromEntries(Object.entries(PLACE_FILES).map(([name, source]) =>
    [name, { source, imported: factories[name] }])), 'main place factory bindings differ from declarations');
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  checkRegistrations();
  console.log('PASS actual place registrations and factory bindings');
}
