import{lineHTML as E,WORDS as $}from"../lang.js";import{MC as N}from"../mc.js";const n=(o,i=document)=>i.querySelector(o),e=o=>String(o??"").replace(/[&<>"]/g,i=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[i]),G={new:"mitaio",progress:"taiochu",done:"kanryo"},g=()=>document.body.classList.contains("phone"),S=o=>"¥"+o.toLocaleString("en"),H="Repair Tickets",V="http://intra.amakawa.co.jp/shuri/list.do";function l(o,{tap:i=!0,en:b=$[o].label}={}){const p=$[o],r=`<ruby lang="ja">${p.ja}<rt>${p.ro}</rt></ruby>`;return i?`<span class="tkw" data-w="${o}" role="button" tabindex="0" title="${e(p.ro)}: ${e(p.en)}">${r}<span class="en">${e(b)}</span></span>`:`<span class="tkw">${r}<span class="en">${e(b)}</span></span>`}const P=(o,i)=>`<span class="tk-badge st-${o}">${l(G[o],{tap:i})}</span>`;function B(o){return String(o||"").split(/\n\s*\n/).map(i=>`<p>${i.split(/(\{[^{}|]+\|[^{}|]+\|[^{}|]+\})/).map(r=>{const u=/^\{([^{}|]+)\|([^{}|]+)\|([^{}|]+)\}$/.exec(r);return u?`<span class="jp" lang="ja">${e(u[1])}</span> <span class="gl">(${e(u[2])}, ${e(u[3])})</span>`:E(r)}).join("")}</p>`).join("")}function F(){return n("#ticketsApp")||n("#ui").insertAdjacentHTML("beforeend",`<div id="ticketsApp" class="panel tk" hidden>
      <div class="tk-url" aria-hidden="true"><span class="nav">◀ ▶ ↻</span><span class="addr">${V}</span></div>
      <section class="tk-page" role="dialog" aria-label="${H}">
        <header class="tk-head">
          <span class="tk-logo"><b lang="ja">天川</b><span>AMAKAWA<small>GROUP</small></span></span>
          <span class="tk-sys">${H}<small>Ver.2.03</small></span>
          <button type="button" class="tk-btn tk-close" data-w="tojiru">${l("tojiru",{tap:!1})}</button>
        </header>
        <div class="tk-info"><span class="who">B2 IT · ${N.name}</span><span class="sum"></span><span class="date"></span></div>
        <nav class="tk-crumb">
          <button type="button" class="tk-btn tk-back" data-w="modoru">${l("modoru",{tap:!1})}</button>
          <span class="path"></span>
        </nav>
        <div class="tk-main">
          <div class="tk-tip list-tip" hidden></div>
          <section class="tk-list">
            <h2 class="tk-h">Tickets <span class="cnt"></span></h2>
            <div class="tk-table" role="listbox" aria-label="Tickets">
              <div class="tk-row hdr"><span class="c-id">No.</span><span class="c-sub">${l("kenmei")}</span><span class="c-from">${l("iraisha")}</span><span class="c-st">${l("jotai")}</span></div>
              <div class="tk-rows"></div>
            </div>
          </section>
          <article class="tk-detail"></article>
        </div>
        <div class="tk-learn" aria-live="polite"></div>
        <footer class="tk-foot">Copyright (C) 1996 Amakawa Group. All Rights Reserved.</footer>
      </section>
    </div>`),n("#ticketsApp")}export function openTickets({list:o,show:i,date:b,earned:p,name:r,read:u,take:R,learn:D=()=>!1,isKnown:j=()=>!1}){const a=F();let k=i||null,f=i?"detail":"list";const O=()=>a.hidden=!0,y=()=>o(),W=()=>y().find(t=>t.id===k)||null;function m(t){if(!$[t]||!D(t))return;const s=$[t];n(".tk-learn",a).innerHTML=`New word in your Words: <b lang="ja">${s.ja}</b> ${e(s.ro)}, ${e(s.en)}`,A()}function A(){for(const s of a.querySelectorAll(".tkw[data-w]"))s.classList.toggle("kn",j(s.dataset.w));const t=n(".tk-learn",a);!t.innerHTML&&!Object.keys($).some(s=>$[s].ui==="tickets"&&j(s))&&(t.textContent=`${g()?"Tap":"Click"} a Japanese label to learn it.`)}function L(t,s){k=t,t&&u(t),s&&(f="detail"),v(),s&&g()&&(n(".tk-main",a).scrollTop=0)}function q(t){return t.length?t.map(s=>`<button type="button" role="option" class="tk-row${s.id===k?" on":""}${s.read?"":" unread"} st-${s.status}" data-id="${e(s.id)}" aria-selected="${s.id===k}"><span class="c-id">${e(s.id)}</span><span class="c-sub">${e(s.title)}</span><span class="c-from">${e(r(s.from))}</span><span class="c-st">${P(s.status,!1)}</span></button>`).join(""):'<div class="empty">No tickets.</div>'}function I(t){if(!t)return'<div class="none">Select a ticket to read it.</div>';const s=t.status==="new"?`<button type="button" class="tk-btn main take" data-w="tanto">${l("tanto",{tap:!1})}</button>`:`<span class="note">${t.status==="done"?"Closed.":"On your list."}</span>`,c=t.pay?`<tr><th>${l("hoshu")}</th><td class="pay">${S(t.pay)}${t.status==="done"?' <span class="paid">Paid</span>':""}</td></tr>`:"";return`<h2 class="tk-h d-head"><span class="d-id">${e(t.id)}</span> Ticket</h2>
      <table class="tk-form d-meta">
        <tr><th>${l("kenmei")}</th><td class="d-title">${e(t.title)}</td></tr>
        <tr><th>${l("iraisha")}</th><td>${e(r(t.from))}</td></tr>
        <tr><th>${l("jotai")}</th><td>${P(t.status,!0)}</td></tr>
        ${c}
        <tr><th>Details</th><td class="d-text">${B(t.text)}</td></tr>
      </table>
      <div class="d-act">${s}<div class="tk-tip take-tip" hidden></div></div>`}function v(){const t=a.contains(document.activeElement);U();const s=document.activeElement,c=w=>!!w?.getClientRects().length;if(!t||a.contains(s)&&c(s))return;const h=g()&&f==="detail"?n(".d-act .take",a)||n(".tk-back",a):n(".tk-rows .on",a);(c(h)?h:n(".tk-page",a))?.focus({preventScroll:!0})}function U(){const t=y(),s=W(),c=g();a.classList.toggle("one",c),a.dataset.mode=c?f:"both",n(".tk-rows",a).innerHTML=q(t),n(".tk-detail",a).innerHTML=I(s),n(".path",a).innerHTML=`Top › Repair tickets${s&&(!c||f==="detail")?` › <b>${e(s.id)}</b>`:""}`;const h=t.filter(d=>d.status!=="done").length;n(".cnt",a).textContent=`${t.length} ticket${t.length===1?"":"s"}, ${h} open`,n(".sum",a).textContent=`Paid to you: ${S(p())}`;const w=n(".list-tip",a);w.hidden=!t.length||t.some(d=>d.read)||c&&f==="detail",w.textContent=c?"Tap a ticket to read it.":"Click a ticket to read it.";const T=n(".take-tip",a);T&&s?.status==="new"&&!t.some(d=>d.status==="progress")&&(T.hidden=!1,T.textContent="Take ticket puts it on your list. It doesn’t have to be done today.");for(const d of a.querySelectorAll(".tk-rows .tk-row"))d.onclick=()=>L(d.dataset.id,!0);const C=n(".d-act .take",a);C&&(C.onclick=()=>{R(s.id)&&(v(),m("tanto"))}),A(),k&&!c&&n(".tk-rows .on",a)?.scrollIntoView({block:"nearest"})}n(".tk-close",a).onclick=()=>{m("tojiru"),O()},n(".tk-back",a).onclick=()=>{f="list",v(),m("modoru")};const x=t=>{const s=t.target.closest(".tkw[data-w]");return s?(t.preventDefault(),t.stopPropagation(),m(s.dataset.w),!0):!1};a.onclick=x,a.onkeydown=t=>{if((t.key==="Enter"||t.key===" ")&&x(t)||t.key!=="ArrowDown"&&t.key!=="ArrowUp")return;const s=y().map(h=>h.id);if(!s.length)return;t.preventDefault();const c=s.indexOf(k);L(s[Math.max(0,Math.min(s.length-1,c<0?0:c+(t.key==="ArrowDown"?1:-1)))],!1)},n(".tk-learn",a).textContent="",n(".date",a).textContent=b||"",i&&u(i),v(),a.hidden=!1,a.classList.remove("in"),a.offsetWidth,a.classList.add("in");const M=n(".tk-page",a);return M.tabIndex=-1,M.focus({preventScroll:!0}),new Promise(t=>{const s=new MutationObserver(()=>{a.hidden&&(s.disconnect(),t())});s.observe(a,{attributes:!0,attributeFilter:["hidden"]})})}
