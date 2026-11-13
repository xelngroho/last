// .addfitur — pasang/ganti plugin langsung dari WhatsApp, tanpa restart. Format plugin = format vanXone (CommonJS).
module.exports = {
  name: 'addfitur',
  command: ['addfitur', 'addplugin', 'pasangfitur'],
  category: 'owner',
  desc: 'Pasang plugin dari WhatsApp (reply kode / kirim file .js)',
  usage: '[kategori/nama] [-f]  + reply kode / file .js',
  owner: true,
  run: async ({ sock, msg, body, prefix, plugins, reloadPlugins, reply }) => {
    const pm = await import('../../src/lib/pluginmgr.js')
    const wa = await import('../../src/lib/wa-utils.js')

    // argumen dibaca dari BARIS PERTAMA saja (baris berikutnya bisa berisi kode yang ditempel)
    const firstLine = String(body || '').split('\n')[0]
    const words = firstLine.trim().split(/\s+/).slice(1)

    if ((words[0] || '').toLowerCase() === 'template') {
      return reply(`*TEMPLATE PLUGIN*\n\n\`\`\`${pm.TEMPLATE}\`\`\`\n\nSimpan sebagai file .js lalu kirim dengan caption: ${prefix}addfitur`)
    }

    const force = words.includes('-f')
    const spec = words.filter((w) => w !== '-f')[0] || ''
    const [maybeCat, maybeName] = spec.includes('/') ? spec.split('/') : [null, spec]
    const name = (maybeName || '').replace(/\.c?js$/i, '') || null
    const category = maybeCat || null

    // sumber kode: file .js (dikirim / di-reply) > teks pesan yang di-reply > teks di baris setelah perintah
    let raw = ''
    try { raw = await wa.getDocumentText(sock, msg) } catch {}
    if (!raw) raw = wa.getQuotedText(msg)
    if (!raw) {
      const nl = String(body || '').indexOf('\n')
      if (nl !== -1) raw = String(body).slice(nl + 1)
    }
    if (!raw.trim()) {
      return reply(
        `*PASANG FITUR*\n\n` +
        `1) Reply pesan berisi kode plugin, lalu ketik:\n${prefix}addfitur\n\n` +
        `2) Atau kirim file .js dengan caption:\n${prefix}addfitur\n\n` +
        `3) Atau tempel kode di baris setelah perintah.\n\n` +
        `• Nama & kategori otomatis dibaca dari isi plugin (field name & category).\n` +
        `• Mau atur sendiri: ${prefix}addfitur tools/play\n` +
        `• Timpa yang sudah ada: tambahkan -f\n` +
        `• Contoh kerangka: ${prefix}addfitur template\n` +
        `• Hapus: ${prefix}delfitur <perintah> • Ambil file: ${prefix}getfitur <perintah> • Muat ulang: ${prefix}reloadfitur\n\n` +
        `⚠️ Plugin berjalan dengan akses penuh ke server. Pasang hanya kode yang kamu percaya.`
      )
    }

    const r = await pm.install({ code: pm.cleanCode(raw), category, name, force, current: plugins, reload: reloadPlugins })
    if (r.error) return reply(`❌ ${r.error}`)

    await reply(
      [
        `✅ *Fitur ${r.overwritten ? 'diganti' : 'terpasang'}!*`,
        '',
        `▬ *File:* custom-plugins/${r.cat}/${r.name}.cjs`,
        `▬ *Perintah:* ${r.cmds.map((c) => prefix + c).join(', ')}`,
        r.plugin.desc && `▬ *Deskripsi:* ${r.plugin.desc}`,
        r.backup && `▬ *Cadangan lama:* plugin-backup/${r.backup}`,
        '',
        'Langsung aktif, tidak perlu restart.',
        !pm.PERSISTENT && '⚠️ DATA_DIR belum diset: kalau bot jalan di Railway, plugin ini hilang saat redeploy. Pasang Volume + DATA_DIR=/data (lihat README).'
      ].filter(Boolean).join('\n')
    )
  }
}
