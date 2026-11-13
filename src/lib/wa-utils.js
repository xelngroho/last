// src/lib/wa-utils.js — pembaca isi pesan WhatsApp untuk .addfitur
// (teks yang di-reply, dan file .js yang dikirim / di-reply). Diport dari lib/utils.js vanXone.
import { normalizeMessageContent, downloadMediaMessage } from '@whiskeysockets/baileys'

const contextOf = (msg) => {
  const m = normalizeMessageContent(msg?.message)
  const type = m && Object.keys(m)[0]
  return m?.[type]?.contextInfo
}

// Teks dari pesan yang di-reply
export function getQuotedText(msg) {
  const q = normalizeMessageContent(contextOf(msg)?.quotedMessage)
  return q?.conversation || q?.extendedTextMessage?.text || q?.imageMessage?.caption || q?.videoMessage?.caption || ''
}

// Isi file dokumen: dari pesan itu sendiri (kirim file + caption) atau dari pesan yang di-reply.
// Mengembalikan string, atau '' kalau tidak ada dokumen.
export async function getDocumentText(sock, msg) {
  const own = normalizeMessageContent(msg?.message)
  let target = null
  if (own?.documentMessage) {
    target = msg
  } else {
    const ci = contextOf(msg)
    const quoted = normalizeMessageContent(ci?.quotedMessage)
    if (quoted?.documentMessage) {
      target = {
        key: { remoteJid: msg.key.remoteJid, id: ci.stanzaId, participant: ci.participant },
        message: ci.quotedMessage
      }
    }
  }
  if (!target) return ''
  const buf = await downloadMediaMessage(target, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage })
  return buf.toString('utf8')
}
