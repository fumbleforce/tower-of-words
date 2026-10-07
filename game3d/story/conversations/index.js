import HAMADA from './hamada.js';
import MORI from './mori.js';
import KENJI from './kenji.js';
export default { on: { ...MORI.on, ...KENJI.on, ...HAMADA.on }, nodes: { ...MORI.nodes, ...KENJI.nodes, ...HAMADA.nodes } };
