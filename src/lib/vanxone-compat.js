// src/lib/vanxone-compat.js — menjalankan plugin format vanXone di loader Nova AI.
// Plugin vanXone: module.exports = { name, command, category, desc, usage, owner, group, admin, botAdmin, run(ctx) }
// Adaptor ini membuat objek ctx yang sama seperti bot vanXone (sock, msg, from, sender, isGroup, isOwner,
// body, args, text, command, prefix, config, plugins, reloadPlugins, react, reply) lalu memanggil plugin.run(ctx).
// Hak akses fail-closed: kalau isOwner tidak diteruskan wa.js, plugin owner ditolak.

const MESS = {
  owner: 'Fitur ini hanya untuk owner.',
  group: 'Fitur ini hanya bisa dipakai di grup.',
  admin: 'Fitur ini hanya untuk admin grup.',
  badmin: 'Jadikan bot sebagai admin grup dulu.',
  error: 'Terjadi kesalahan pada fitur ini. Coba lagi nanti.'
}

const numOf = (jid) => String(jid || '').split('@')[0].split(':')[0]

// Info admin grup (sender & bot) dari metadata grup
async function getGroupInfo(sock, from, sender) {
  const metadata = await sock.groupMetadata(from)
  const ids = (p) => [p.id, p.jid, p.lid, p.phoneNumber].filter(Boolean).map(numOf)
  const isAdminP = (jid) => metadata.participants.some((p) => ids(p).includes(numOf(jid)) && (p.admin === 'admin' || p.admin === 'superadmin'))
  return { metadata, isAdmin: isAdminP(sender), isBotAdmin: isAdminP(sock.user?.id) || isAdminP(sock.user?.lid) }
}

// deps: { getRegistry: () => [...], reload: async () => result, config: () => objek config.json, botName: () => string }
export function wrapVanXonePlugin(plugin, deps) {
  return async (msg, sock, args, extra = {}) => {
    const from = msg.key.remoteJid
    const sender = msg.key.participant || from
    const isGroup = from.endsWith('@g.us')
    const isOwner = extra.isOwner === true

    // body = teks pesan utuh (boleh multi-baris, mis. kode yang ditempel di bawah perintah)
    const body = String(extra.body ?? args.join(' '))
    const head = body.trim().match(/^\S+/)?.[0] || ''
    const command = head.toLowerCase().replace(/^[\/.#]/, '')
    const prefix = /^[\/.#]/.test(head) ? head[0] : '/'
    const after = body.trim().slice(head.length).trim()
    const restArgs = after ? after.split(/\s+/) : []

    const reply = (text) => sock.sendMessage(from, typeof text === 'object' && text !== null ? text : { text: String(text) }, { quoted: msg })
    const react = (emoji = '⏳') => sock.sendMessage(from, { react: { text: emoji, key: msg.key } }).catch(() => {})

    if (plugin.owner && !isOwner) return reply(MESS.owner)
    if ((plugin.group || plugin.admin || plugin.botAdmin) && !isGroup) return reply(MESS.group)

    const cfg = deps.config?.() || {}
    const ctx = {
      sock, msg, from, sender, isGroup, isOwner, body, command, prefix,
      args: restArgs,
      text: restArgs.join(' '),
      config: {
        ...cfg,
        botName: deps.botName?.() || cfg.nama_ai || 'Nova AI',
        ownerName: 'Axel',
        prefix,
        footer: '',
        richMode: false,
        mess: { only: { group: MESS.group, owner: MESS.owner, admin: MESS.admin, badmin: MESS.badmin }, error: { fitur: MESS.error } }
      },
      plugins: deps.getRegistry(),
      reloadPlugins: deps.reload,
      react,
      reply
    }

    // info grup hanya diambil kalau dibutuhkan (flag admin/botAdmin, atau plugin membaca isAdmin/isBotAdmin/groupMetadata)
    const wantsInfo = isGroup && (plugin.admin || plugin.botAdmin || /\b(isAdmin|isBotAdmin|groupMetadata)\b/.test(String(plugin.run)))
    if (wantsInfo) {
      try {
        const info = await getGroupInfo(sock, from, sender)
        ctx.groupMetadata = info.metadata
        ctx.isAdmin = info.isAdmin
        ctx.isBotAdmin = info.isBotAdmin
      } catch {
        ctx.isAdmin = false
        ctx.isBotAdmin = false
      }
      if (plugin.admin && !ctx.isAdmin && !isOwner) return reply(MESS.admin)
      if (plugin.botAdmin && !ctx.isBotAdmin) return reply(MESS.badmin)
    }

    return plugin.run(ctx)
  }
}
