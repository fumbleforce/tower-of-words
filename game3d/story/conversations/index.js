import MORI from './mori.js';
import KENJI from './kenji.js';
export default { on: { ...MORI.on, ...KENJI.on }, nodes: { ...MORI.nodes, ...KENJI.nodes } };
