export async function storyLoads(r,t,a,{arriving:o=!1}={}){try{return await a(t),!0}catch(n){return console.error(n),o||(r.transition=null),r.ui.toast("That place couldn't load. Try again."),!1}}
