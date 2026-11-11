// src/lib/ui-style.js — gaya teks menu ala vanXone (diport dari lib/engine/pulse-style.js).
// Huruf kecil small-caps, judul "⌯ judul", baris "- kunci : *nilai*", item "▢ teks".
// Fungsi murni, tanpa efek samping.
const SMALLCAPS = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ',
  n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ'
}

export const smallCaps = (s) => [...String(s)].map((c) => SMALLCAPS[c.toLowerCase()] || c).join('')

export const heading = (t) => smallCaps(`*⌯ ${t}*`)
export const kv = (k, v) => `- ${smallCaps(k)} : *${v}*`
export const item = (t) => `▢ ${t}`
export const line = '──────────────────────'
