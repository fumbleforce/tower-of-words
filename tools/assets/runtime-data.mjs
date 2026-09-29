// Shared declarations plus static preview coordinates; no renderer or asset-directory scan.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PORTRAITS } from '../../game3d/js/ui/portrait-data.js';
import { PLACE_FILES } from '../../game3d/js/places/definitions.js';
import { PLACE_DETAILS } from '../../game3d/js/places/catalog.js';
import { inspectPlaceSource } from '../lib/place-source.mjs';
import { assetSourceData } from './source-data.mjs';

export function assetRuntimeData(read = file => fs.readFileSync(new URL('../../' + file, import.meta.url), 'utf8')) {
  const props = [];
  for (const [place, file] of Object.entries(PLACE_FILES)) {
    const { things } = inspectPlaceSource(read(file));
    for (const [id, metadata] of Object.entries(PLACE_DETAILS[place].things)) {
      if (metadata.kind.includes('person')) continue;
      const geometry = things[id];
      if (!geometry) throw new Error(`${file}: missing things.${id}`);
      if (!geometry.moving && !['v3', 'carPt'].includes(geometry.anchor?.function)) {
        throw new Error(`${file}: unsupported preview anchor for ${id}`);
      }
      props.push({ place, file, room: file.split('/').at(-1).replace('.js', ''), id, ...metadata, ...geometry });
    }
  }
  return { portraits: PORTRAITS, props, source: assetSourceData(read) };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(assetRuntimeData()));
