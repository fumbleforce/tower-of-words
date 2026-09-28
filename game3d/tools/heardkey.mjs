// same hash as js/runner.js heardKey
export function heardKey(text) { let h = 5381; for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0; return 'oh-' + h.toString(36); }
export function lineKey(who, text = '') { return 'ln-' + heardKey(who + '|' + text).slice(3); }
