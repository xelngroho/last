// src/lib/pluginmgr.js — pemasangan plugin dari WhatsApp (.addfitur), diport dari lib/pluginmgr.js vanXone.
// Kode diuji dulu di folder staging (sintaks + bentuk plugin) sebelum benar-benar dipasang, dan kalau gagal
// dimuat setelah dipasang, keadaan dikembalikan seperti semula.
//
// Format plugin = format vanXone (CommonJS): module.exports = { name, command, category, desc, run(ctx) }.
// Plugin disimpan sebagai <DATA_DIR>/custom-plugins/<kategori>/<nama>.cjs. Karena memakai DATA_DIR,
// plugin ikut tersimpan di Railway Volume (kalau Volume dipasang) dan tidak hilang saat redeploy.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const DATA_DIR = process.env.DATA_DIR || ROOT

export const CUSTOM_DIR = path.join(DATA_DIR, 'custom-plugins')
export const BUILTIN_DIR = path.join(ROOT, 'plugins')
export const BACKUP_DIR = path.join(DATA_DIR, 'plugin-backup')
export const PERSISTENT = !!process.env.DATA_DIR // false = filesystem sementara (mis. Railway tanpa Volume)
const STAGE = path.join(CUSTOM_DIR, '.stage')
const MAX_BYTES = 200 * 1024

// plugin inti pengelola — tidak boleh ditimpa/dihapus lewat bot
export const PROTECTED = new Set(['addfitur', 'delfitur', 'getfitur', 'reloadfitur', 'menu', 'help', 'allmenu', 'menu1'])
// perintah yang ditangani langsung di wa.js; plugin tidak boleh membajaknya
export const RESERVED = new Set(['ds', 'setoken', 'self', 'ai', 'sc', 'spotify', 'brat', 'dd'])

let busy = false

export const TEMPLATE = `module.exports = {
  name: 'contoh',
  command: ['contoh', 'cth'],
  category: 'tools',
  desc: 'Deskripsi singkat fitur',
  usage: '<teks>',
  // owner: true,   // hanya owner
  // group: true,   // hanya di grup
  // admin: true,   // hanya admin grup
  run: async ({ sock, msg, from, sender, args, text, prefix, reply }) => {
    if (!text) return reply(\`Contoh: \${prefix}contoh halo\`)
    await reply(\`Kamu menulis: \${text}\`)
  }
}`

export const commandsOf = (p) => (Array.isArray(p.command) ? p.command : [p.command]).map((c) => String(c).toLowerCase())
export const validName = (s) => /^[a-z0-9][a-z0-9_-]{0,38}$/i.test(s || '')
const slug = (s) => String(s || '').toLowerCase().replace(/\.c?js$/, '').replace(/[^a-z0-9_-]/g, '').replace(/^[^a-z0-9]+/, '').slice(0, 39)

// Siapkan folder plugin custom. Kalau DATA_DIR di luar folder project (Volume), pasang symlink node_modules
// supaya plugin custom tetap bisa require('axios') dll dari dependency project.
export function prepareCustomDir() {
  fs.mkdirSync(CUSTOM_DIR, { recursive: true })
  if (path.resolve(DATA_DIR) !== ROOT) {
    const link = path.join(CUSTOM_DIR, 'node_modules')
    try {
      if (!fs.existsSync(link)) fs.symlinkSync(path.join(ROOT, 'node_modules'), link, 'junction')
    } catch {}
  }
}

// Buang pagar kode ``` yang sering ikut tertempel dari chat
export function cleanCode(raw) {
  let c = String(raw || '').replace(/\r\n/g, '\n').trim()
  const m = c.match(/^```[a-z]*\n([\s\S]*?)\n?```$/i)
  if (m) c = m[1]
  return c.replace(/^​|​$/g, '').trim() + '\n'
}

function diagnose(code) {
  if (/^\s*(import\s.+from\s|export\s+(default|const|function|async))/m.test(code)) {
    return 'Kode memakai import/export (ESM). Plugin harus CommonJS (format vanXone): pakai require(...) dan module.exports = { ... }.'
  }
  if (!/module\.exports|exports\./.test(code)) {
    return 'Ini skrip mandiri, bukan plugin. Bungkus dalam module.exports = { name, command, category, desc, run }. Lihat contoh: addfitur template'
  }
  if (/require\(\s*['"`]\.{1,2}\/(?:\.\.\/)*lib\//.test(code)) {
    return 'Plugin ini memakai lib internal vanXone (require(\'../../lib/...\')) yang tidak ada di Nova AI. Ganti dengan modul npm atau fetch, atau salin fungsinya ke dalam plugin.'
  }
  return null
}

function syntaxCheck(file) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', timeout: 15000 })
  if (r.status === 0) return null
  const lines = String(r.stderr).split('\n').map((l) => l.trim()).filter(Boolean)
  const where = lines.find((l) => /:\d+$/.test(l)) || ''
  const msg = lines.find((l) => /Error/.test(l)) || lines[0] || 'kesalahan sintaks'
  return `${msg}${where ? ` (${path.basename(where).replace(/^[^:]*:/, 'baris ')})` : ''}`
}

// opts: { code, category?, name?, force?, current: [entri registry...], reload: async () => { failed: [...] } }
// category & name boleh kosong: dibaca otomatis dari plugin itu sendiri (field category / name / command pertama).
export async function install({ code, category, name, force = false, current = [], reload }) {
  if (busy) return { error: 'Sedang ada proses pemasangan lain. Coba sebentar lagi.' }
  if (name && !validName(name)) return { error: 'Nama file tidak valid. Pakai huruf/angka/_/- saja (maks 39 karakter).' }
  if (category && !validName(category)) return { error: 'Nama kategori tidak valid.' }
  if (Buffer.byteLength(code) > MAX_BYTES) return { error: `Kode terlalu besar (maks ${MAX_BYTES / 1024} KB).` }
  const hint = diagnose(code)
  if (hint) return { error: hint }

  busy = true
  prepareCustomDir()
  fs.mkdirSync(STAGE, { recursive: true })
  const staged = path.join(STAGE, `${Date.now()}.cjs`)
  let target
  try {
    fs.writeFileSync(staged, code)

    const syn = syntaxCheck(staged)
    if (syn) return { error: `Kesalahan sintaks: ${syn}` }

    // muat sekali untuk memeriksa bentuknya
    let plugin
    try {
      delete require.cache[staged]
      plugin = require(staged)
    } catch (e) {
      const mod = String(e.message).match(/Cannot find module '([^'./][^']*)'/)
      return { error: mod ? `Modul "${mod[1]}" belum terpasang. Jalankan di server: npm install ${mod[1]}` : `Gagal memuat kode: ${String(e.message).slice(0, 160)}` }
    } finally {
      delete require.cache[staged]
    }
    if (!plugin || typeof plugin.run !== 'function' || !plugin.command) {
      return { error: 'Format plugin salah: wajib ada run (fungsi) dan command. Lihat contoh: addfitur template' }
    }
    const cmds = commandsOf(plugin)

    // nama & kategori otomatis dari isi plugin kalau tidak disebut
    const finalName = name || slug(plugin.name) || slug(cmds[0])
    if (!validName(finalName)) return { error: 'Nama plugin tidak bisa ditentukan. Sebutkan manual: addfitur kategori/nama' }
    const cat = category || slug(plugin.category) || 'custom'
    if (!validName(cat)) return { error: 'Nama kategori/folder tidak valid.' }

    target = path.join(CUSTOM_DIR, cat, `${finalName}.cjs`)
    if (!target.startsWith(CUSTOM_DIR + path.sep)) return { error: 'Lokasi tidak diizinkan.' }
    if (PROTECTED.has(finalName) || cmds.some((c) => PROTECTED.has(c))) return { error: 'Nama/perintah itu dilindungi dan tidak boleh ditimpa.' }
    const reserved = cmds.filter((c) => RESERVED.has(c))
    if (reserved.length) return { error: `Perintah ${reserved.map((c) => '/' + c).join(', ')} dipakai fitur inti bot dan tidak boleh dipakai plugin. Ganti command-nya.` }

    // bentrok perintah dengan plugin lain (termasuk plugin bawaan Nova AI)
    const clash = []
    for (const c of cmds) {
      const owner = current.find((p) => commandsOf(p).includes(c) && p.__file !== target)
      if (owner) clash.push(`/${c} (${owner.__file ? path.relative(ROOT, owner.__file) : '?'})`)
    }
    if (clash.length) return { error: `Perintah sudah dipakai plugin lain: ${clash.join(', ')}. Ganti command-nya.` }

    const existed = fs.existsSync(target)
    if (existed && !force) return { error: `Plugin ${cat}/${finalName} sudah ada. Tambahkan -f untuk menimpa (yang lama dicadangkan).` }
    let backup = null
    if (existed) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
      backup = path.join(BACKUP_DIR, `${cat}-${finalName}-${Date.now()}.cjs`)
      fs.copyFileSync(target, backup)
    }

    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(staged, target)
    const res = await reload()
    const bad = (res.failed || []).find((f) => path.resolve(f.full || '') === target)
    if (bad) {
      // gagal setelah dipasang: kembalikan keadaan semula
      if (backup) fs.copyFileSync(backup, target)
      else fs.rmSync(target, { force: true })
      await reload()
      return { error: `Gagal dimuat setelah dipasang (${String(bad.error).slice(0, 120)}). Dikembalikan seperti semula.` }
    }
    return { ok: true, cat, name: finalName, cmds, overwritten: existed, backup: backup && path.basename(backup), plugin, file: target }
  } finally {
    fs.rmSync(staged, { force: true })
    busy = false
  }
}

// Hapus plugin custom (dicadangkan dulu). Plugin bawaan Nova AI dihapus lewat repo, bukan lewat bot.
export async function remove({ plugin, reload }) {
  const file = plugin.__file
  if (!file || !file.startsWith(CUSTOM_DIR + path.sep)) {
    return { error: 'Hanya plugin custom (hasil addfitur) yang bisa dihapus lewat bot. Plugin bawaan hapus lewat repo.' }
  }
  const base = path.basename(file).replace(/\.c?js$/, '')
  if (PROTECTED.has(base) || commandsOf(plugin).some((c) => PROTECTED.has(c))) return { error: 'Plugin inti dilindungi dan tidak boleh dihapus.' }
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
  const backup = path.join(BACKUP_DIR, `${path.basename(path.dirname(file))}-${base}-${Date.now()}.cjs`)
  fs.copyFileSync(file, backup)
  fs.rmSync(file, { force: true })
  await reload()
  return { ok: true, file: path.relative(CUSTOM_DIR, file), backup: path.basename(backup) }
}
