export function bondGate(e,n,...t){return Object.assign({},...t)[n]||`bond${n}_${e}`}export function storyBondGate(e,n,t,o){return bondGate(t,o,e[t]?.gates,...n.map(a=>a.gates?.[t]))}
