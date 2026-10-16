import{flags as e}from"../../narrative/state.js";export function bakeryAction(t,a,o){return async c=>{e.bakery_action_complete=!1;const r=await o(c);e.bakery_action_complete=t.place===a&&r===!0}}
