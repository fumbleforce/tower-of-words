import{PACKAGING as e}from"./grocery-labels.js";import{DIRECTORY_ID as o,directoryPages as i}from"./island-directory.js";export const ITEM_DOCUMENTS=Object.freeze({[o]:i,milk:()=>[e.milk.join(`
`)],riceball:()=>[e.riceball.join(`
`)]});export function itemDocumentPages(r){return ITEM_DOCUMENTS[r]?.()||null}
