// .reloadfitur — muat ulang semua plugin dari disk. Format plugin = format vanXone (CommonJS).
module.exports = {
  name: 'reloadfitur',
  command: ['reloadfitur', 'reload', 'muatulang'],
  category: 'owner',
  desc: 'Muat ulang plugin custom (.cjs) dari disk setelah mengedit file manual',
  owner: true,
  run: async ({ reloadPlugins, reply }) => {
    const r = await reloadPlugins()
    await reply(
      [
        `🔄 *${r.loaded} plugin dimuat*`,
        r.failed.length
          ? `\n⚠️ ${r.failed.length} gagal:\n${r.failed.slice(0, 8).map((f) => `• ${f.file}: ${String(f.error).slice(0, 80)}`).join('\n')}`
          : '✅ Tidak ada kegagalan.'
      ].join('\n')
    )
  }
}
