// src/lib/buttons.js — pengirim pesan bertombol (native flow) untuk Nova AI.
// Diport dari wraper-send/buttons-send.js milik vanXone, dipangkas ke yang dipakai menu:
// tombol quick_reply, link (cta_url), copy (cta_copy), dan list (single_select), plus header media.
// Dipasang SEKALI di wa.js: makeButtonsHelper(sock)  ->  sock.sendButtons(jid, content, { quoted })
// Tidak mengubah sock.sendMessage bawaan, jadi semua plugin lama tetap jalan seperti biasa.
import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto
} from '@whiskeysockets/baileys'

const bizNode = {
  tag: 'biz',
  attrs: {},
  content: [{
    tag: 'interactive',
    attrs: { type: 'native_flow', v: '1' },
    content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
  }]
}

// Pembuat tombol. id tombol = teks perintah yang dijalankan bot saat ditekan (mis. '/menu fun')
export const btn = {
  reply: (text, id) => ({ name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: text, id }) }),
  url: (text, url) => ({ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: text, url, merchant_url: url }) }),
  copy: (text, code) => ({ name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: text, copy_code: code }) }),
  list: (title, sections) => ({ name: 'single_select', buttonParamsJson: JSON.stringify({ title, sections }) })
}

export default function makeButtonsHelper(sock) {
  const uploadMedia = (content) => prepareWAMessageMedia(content, { upload: sock.waUploadToServer })

  const buildHeader = async (content = {}) => {
    if (content.image) {
      const m = await uploadMedia({ image: content.image })
      return { hasMediaAttachment: true, imageMessage: m.imageMessage }
    }
    if (content.video) {
      const m = await uploadMedia({ video: content.video })
      return { hasMediaAttachment: true, videoMessage: m.videoMessage }
    }
    return { hasMediaAttachment: false }
  }

  // tombol sudah berbentuk { name, buttonParamsJson } (dari btn.*) -> dipakai apa adanya
  const convertButtons = (buttons = []) => buttons.map((b, i) => {
    if (b.name) return b
    const text = b.displayText || b.text || ''
    if (b.url) return { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: text, url: b.url }) }
    if (b.copy) return { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: text, copy_code: b.copy }) }
    return { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: text, id: b.id || `btn_${i}` }) }
  })

  const buildContextInfo = (options = {}, extra = {}) => {
    const ctx = { ...extra, ...(options.contextInfo || {}) }
    if (options.quoted) {
      const q = options.quoted
      ctx.stanzaId = q?.key?.id
      ctx.participant = q?.key?.participant || q?.key?.remoteJid
      ctx.quotedMessage = q?.message
    }
    return ctx
  }

  const _relay = sock.relayMessage.bind(sock)
  sock.sendRelay = async (jid, message, options = {}) => {
    const extra = options.additionalNodes || []
    const needsBiz = message?.interactiveMessage || message?.viewOnceMessage?.message?.interactiveMessage
    const nodes = needsBiz && !extra.some((n) => n.tag === 'biz') ? [bizNode, ...extra] : extra
    return _relay(jid, message, { ...options, additionalNodes: nodes.length ? nodes : undefined })
  }

  // content: { text, footer, title, image|video, buttons: [btn.*], contextInfo }
  sock.sendButtons = async (jid, content = {}, options = {}) => {
    const contextInfo = buildContextInfo(options, content.contextInfo || {})
    const header = await buildHeader(content)
    const msg = generateWAMessageFromContent(jid, {
      viewOnceMessage: {
        message: {
          interactiveMessage: proto.Message.InteractiveMessage.create({
            header: {
              title: content.title || '',
              subtitle: content.subtitle || '',
              hasMediaAttachment: header.hasMediaAttachment || false,
              ...(header.imageMessage && { imageMessage: header.imageMessage }),
              ...(header.videoMessage && { videoMessage: header.videoMessage })
            },
            body: { text: content.text || '' },
            footer: { text: content.footer || '' },
            contextInfo,
            nativeFlowMessage: { buttons: convertButtons(content.buttons || []), messageParamsJson: '' }
          })
        }
      }
    }, { userJid: sock.user?.id, quoted: options.quoted })
    return sock.sendRelay(jid, msg.message, {
      messageId: msg.key.id,
      additionalNodes: [bizNode, ...(options.additionalNodes || [])]
    })
  }

  return sock
}

export { makeButtonsHelper }
