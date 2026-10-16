export const FAR_VIEW=new URLSearchParams(globalThis.location?.search||"").get("far")!=="0",farFollow=()=>FAR_VIEW&&!globalThis.matchMedia?.("(pointer: coarse)").matches;
