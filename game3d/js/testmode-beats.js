export function missingBeats(t,n,a,r){return t.filter(e=>!n[e.flag]).map(e=>`${r} not done: ${e.beat} (${e.flag} not set)`+(a.includes(e.place)?"":`; the run never reached the ${e.place}`))}
