// .delfitur — hapus plugin custom (dicadangkan dulu). Format plugin = format vanXone (CommonJS).
module.exports = {
  name: 'delfitur',
  command: ['delfitur', 'delplugin', 'hapusfitur'],
  category: 'owner',
  desc: 'Hapus plugin custom berdasarkan perintahnya (dicadangkan dulu)',
  usage: '<perintah>',
  owner: true,
  run: async ({ args, prefix, plugins, reloadPlugins, reply }) => {
    const pm = await import('../../src/lib/pluginmgr.js')
    const q = (args[0] || '').toLowerCase().replace(/^[./!#]/, '')
    if (!q) return reply(`Format: ${prefix}delfitur <perintah>\nContoh: ${prefix}delfitur halo`)
    const plugin = plugins.find((p) => pm.commandsOf(p).includes(q) || String(p.name).toLowerCase() === q)
    if (!plugin) return reply(`Tidak ada plugin dengan perintah/nama "${q}".`)
    const r = await pm.remove({ plugin, reload: reloadPlugins })
    if (r.error) return reply(`❌ ${r.error}`)
    await reply(`🗑️ Dihapus: custom-plugins/${r.file}\nCadangan: plugin-backup/${r.backup}\nPulihkan dengan ${prefix}addfitur (kirim file cadangan).`)
  }
}
