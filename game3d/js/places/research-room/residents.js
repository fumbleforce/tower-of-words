import { idle } from '../../cast.js';
import { roleBody } from '../../crowd/bodies.js';
import { K } from '../../scenes/office.js';
import { READER } from '../../scenes/research-room/plan.js';
import { blob } from '../../engine.js';
export function researchReader(root) {
  const rig = roleBody('reader', 91, { proxy: true, tint: { top: '#79816c' } });
  if (!rig) throw new Error('Research reader body was not prepared');
  rig.readingIdle = (t) => {
    if (!rig.meshy) idle(rig, t);
  };
  rig.root.scale.multiplyScalar(K);
  root.add(rig.root);
  rig.root.add(blob(0.3, 0.22));
  rig.sitAt(READER.x, READER.top, READER.z, READER.ry);
  rig.seated = true;
  return rig;
}
