export function route(p,e,n,c){const s=p.path(e.x,e.z,n[0],n[1]),t=s&&s.length?s.slice():c||[n],h=t[t.length-1];return Math.hypot(h[0]-n[0],h[1]-n[1])>.02&&t.push([n[0],n[1]]),t}
