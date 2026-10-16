import{PLACE_NAMES as n,TRIPS as R}from"../places/definitions.js";import{BAKERY_FIRST_DAY as _,BAKERY_HOURS as l}from"./shop-hours.js";import{dateOf as u}from"../bonds/model.js";import{PINS as e}from"../travel/pins.js";export const DIRECTORY_ID="island_directory";const a=[["forecourt","campus","plaza"],["shotengai","east_coast"],["sports"]];export function directoryPages(){const s=new Set(["bakery","office","print_shop","canteen","izakaya","karaoke","dorm_commons","gym","pool"]);return a.map((i,c)=>{const m=i.flatMap(t=>{const p=Object.entries(e).filter(([o,f])=>s.has(o)&&f.in===t).map(([o])=>n[o]+(o==="bakery"?`
Opens `+u(_)+"; "+l.join(", ")+".":"")),r=(R[t]||[]).filter(o=>e[o]?.at).map(o=>n[o]);return[n[t]+": "+p.join(" · ")+(r.length?`
Walks to `+r.join(", ")+".":"")]});return"ISLAND DIRECTORY · "+(c+1)+" / "+a.length+`

`+m.join(`

`)})}
