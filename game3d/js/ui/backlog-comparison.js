import{heardHTML as a}from"./dialogue-text.js";export function earlierReading(r,i){if(!r.memoryId||!r.ov||!Array.isArray(r.knownAtTime))return"";const e=a(r.text,r.clear,new Set(r.knownAtTime));return e===i?"":`<details class="reading-before"><summary>What I understood then</summary>
    <div class="tx">${e}</div></details>`}
