export function createFramePacer(){let n=null,r=0;return(e,t)=>{if(!t)return n=null,!0;const u=1e3/t,i=Math.min(3,u/4);return t!==n?(n=t,r=e+u,!0):e+i<r?!1:(r+=u,r<=e+i&&(r=e+u),!0)}}
