import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import config from '../../config.js'
import { btn } from '../../src/lib/buttons.js'
import { heading, kv, item, line } from '../../src/lib/ui-style.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

const pluginConfig = {
  name: 'menu',
  alias: ['help', 'allmenu', 'menu1'],
  category: 'main',
  description: 'Menampilkan menu & daftar fitur bot',
  usage: '.menu',
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
}

function getGreeting() {
  const hour = Number(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false })
  )
  if (hour >= 4 && hour < 11) return 'Pagi'
  if (hour >= 11 && hour < 15) return 'Siang'
  if (hour >= 15 && hour < 18) return 'Sore'
  return 'Malam'
}

// Daftar command yang beneran aktif & jalan. Diupdate manual tiap ada
// plugin baru — sengaja gak auto-scan folder plugins/ biar command yang
// belum siap (masih nunggu dependency dll) gak ikut ditampilkan ke user.
const MENU_SECTIONS = [
  {
    title: '🖼️ CANVAS & MAKER',
    items: [
      ['buatquotes', 'bq | quoteanime', 'Buat quote anime custom'],
      ['fakebankjago', '-', 'Bikin fake chat/notif bank'],
      ['igstory', 'igstorypost', 'Simulasi post IG Story'],
      ['iqc', 'qc2', 'Fake quote iOS style'],
      ['iqcpink', '-', 'Fake quote iOS style (pink)'],
    ],
  },
  {
    title: '🤖 AI',
    items: [
      ['text2img2', 't2i2 | genimg', 'Generate gambar dari teks'],
      ['dpsteai', 'dpste | dipasteai', 'Chat AI dipastebin (session per-user)'],
    ],
  },
  {
    title: '😄 FUN',
    items: [
      ['pakustad', 'tanyaustad', 'Tanya pak ustad (gambar)'],
      ['akankah', 'apakah | bagaimana | berapa | bisakah | dimana | haruskah | kapan | mengapa | coba', 'Tanya bot, jawaban random'],
      ['mimpi', '-', 'Tafsir mimpi random'],
      ['rate', '-', 'Rating random buat sesuatu/seseorang'],
      ['soulmatch', '-', 'Cek kecocokan jiwa dua nama'],
      ['puisi', 'sajak', 'Puisi random'],
      ['senja', 'katacinta', 'Kata-kata senja/romantis random'],
      ['fuckmylife', 'fml', 'Cerita FML random'],
      ['meme', 'randommeme', 'Meme Indonesia random (gambar)'],
      ['lahelu', '-', 'Gambar/video lahelu random'],
      ['barandom', 'ba', 'Gambar Blue Archive random'],
      ['quotesimage', 'qimg', 'Gambar quotes random'],
    ],
  },
  {
    title: '🔮 PRIMBON',
    items: [
      ['zodiak', 'horoscope | ramalan', 'Ramalan zodiak'],
      ['artinama', '-', 'Arti sebuah nama'],
      ['tafsirmimpi', 'artimimpi', 'Tafsir mimpi berdasar kata kunci'],
      ['ramalanjodoh', '-', 'Ramalan jodoh'],
      ['kecocokannamapasangan', '-', 'Cek kecocokan nama pasangan'],
      ['nomerhoki', '-', 'Nomor hoki'],
      ['potensipenyakit', '-', 'Potensi penyakit dari nama/tanggal lahir'],
      ['sifatusahabisnis', '-', 'Sifat usaha/bisnis dari nama'],
    ],
  },
  {
    title: '☪️ ISLAMI',
    items: [
      ['quran', 'surah | alquran', 'Baca ayat Al-Quran per surah'],
      ['murrotal', 'quraudio', 'Audio murottal per surah'],
      ['audioquran', 'audio-quran', 'Cari audio Quran per Qari (mp3quran)'],
      ['islami', 'doa | niatsholat | asmaulhusna', 'Kumpulan fitur Islami'],
    ],
  },
  {
    title: '📰 BERITA',
    items: [
      ['berita', 'antara | cnn | cnbc | sindonews', 'Berita dari berbagai sumber'],
    ],
  },
  {
    title: 'ℹ️ INFO',
    items: [
      ['gempa', 'bmkg | infogempa', 'Info gempa terkini BMKG'],
      ['jadwalbola', 'bola | football', 'Jadwal pertandingan bola'],
      ['livescore', 'skor | livebola', 'Skor bola live'],
      ['bluearchive-char', 'bachar', 'Info karakter Blue Archive'],
      ['gag', 'growagarden', 'Stok item Grow a Garden'],
      ['gag2', 'growagarden2', 'Stok GAG + mode watch'],
      ['harilibur', 'libur', 'Hari libur & nasional mendatang'],
      ['infotourney', 'tourney', 'Info turnamen Mobile Legends'],
    ],
  },
  {
    title: '🛠️ UTILITY',
    items: [
      ['ping', 'speed | p', 'Cek respons bot'],
      ['sh', 'search', 'Shell / pencarian'],
      ['ssweb', 'ss | webss', 'Screenshot website'],
    ],
  },
  {
    title: '👑 OWNER',
    items: [
      ['ai {provider}', '-', 'Ganti AI provider global'],
      ['self', '-', 'Toggle mode privat (hanya owner)'],
      ['ds', '-', 'Disconnect sementara'],
      ['setoken {token}', '-', 'Simpan token Vercel'],
      ['deploy', 'vercel', 'Deploy HTML ke Vercel'],
    ],
  },
]

function buildMenuText(m) {
  const prefix = m.prefix || '/'
  const namaBot = config.nama_ai || 'Nova AI'
  const namaOwner = 'Axel'
  const greeting = getGreeting()
  const totalCmd = MENU_SECTIONS.reduce((n, s) => n + s.items.length, 0)

  const line = '─'.repeat(28)
  let out = ''
  out += `╭─❒ ✦ 『 *${namaBot.toUpperCase()}* 』 ✦\n`
  out += `│ Selamat ${greeting}, ${m.pushName || 'Kak'} 👋\n`
  out += `│ Owner   : ${namaOwner}\n`
  out += `│ Prefix  : ${prefix}\n`
  out += `│ Total   : ${totalCmd} command\n`
  out += `╰${line}\n\n`

  for (const section of MENU_SECTIONS) {
    out += `┌─ ${section.title}\n`
    for (const [cmd, alias, desc] of section.items) {
      out += `│ ⟡ ${prefix}${cmd}`
      if (alias !== '-') out += ` _(${alias})_`
      out += `\n│    ${desc}\n`
    }
    out += `└${line}\n\n`
  }

  out += `✦ Ketik ${prefix}menu kapan aja buat liat daftar ini lagi.\n`
  out += `✦ Ada command yang belum aktif (masih proses setup), bakal nyusul ya.`

  return out
}

// =====================================================================
//  TAMPILAN BARU — kartu bertombol ala vanXone (data MENU_SECTIONS di atas tidak diubah)
//  Pola: [ Saluran (link) , Owner (link) , Command (list kategori) ]
// =====================================================================
const CAT_DESC = {
  canvas: 'Quote, fake chat, dan kartu visual',
  ai: 'Chat AI dan generate gambar dari teks',
  fun: 'Hiburan, tanya-jawab random, meme',
  primbon: 'Ramalan, zodiak, arti nama dan mimpi',
  islami: 'Al-Quran, murottal, doa, dan niat sholat',
  berita: 'Berita terkini dari berbagai sumber',
  info: 'Gempa, bola, jadwal libur, info game',
  utility: 'Ping, screenshot website, dan alat bantu',
  owner: 'Perintah khusus owner bot',
}
const CAT_ALIAS = { maker: 'canvas', tools: 'utility', util: 'utility', islam: 'islami', religi: 'islami', news: 'berita' }

// "CANVAS & MAKER" -> "Canvas & Maker"; kata sangat pendek (AI) tetap kapital
const titleCase = (s) => s.split(' ').map((w) => (w.length <= 2 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join(' ')

// MENU_SECTIONS -> daftar kategori (id, ikon, label, jumlah) tanpa mengubah datanya
const CATEGORIES = MENU_SECTIONS.map((section) => {
  const [icon, ...rest] = section.title.split(' ')
  const text = rest.join(' ')
  const id = text.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
  return { id, icon, label: titleCase(text), desc: CAT_DESC[id] || `Kumpulan perintah ${text.toLowerCase()}`, section }
})

const findCategory = (q) => {
  const k = String(q || '').toLowerCase().trim()
  const id = CAT_ALIAS[k] || k
  return CATEGORIES.find((c) => c.id === id)
}

// dua kategori terbesar (min. 8 fitur) diberi badge populer
const POPULAR = new Set(
  [...CATEGORIES].filter((c) => c.section.items.length >= 8).sort((a, b) => b.section.items.length - a.section.items.length).slice(0, 2).map((c) => c.id)
)

function categoryRows(prefix) {
  return CATEGORIES.map((c) => {
    const n = c.section.items.length
    return {
      header: POPULAR.has(c.id) ? `🔥 Populer (${n} Fitur)` : `${n} Fitur`,
      title: `${c.icon} ${c.label}`,
      description: c.desc.slice(0, 72),
      id: `${prefix}menu ${c.id}`,
    }
  })
}

function actionRows(prefix) {
  return [
    { header: 'Aksi', title: '🏓 Ping', description: 'Cek respons bot', id: `${prefix}ping` },
    { header: 'Aksi', title: '📜 Semua Perintah', description: 'Daftar lengkap seluruh command', id: `${prefix}allmenu` },
  ]
}

// tombol link hanya muncul kalau datanya ada di config.json (owner_wa, saluran)
function linkButtons() {
  const out = []
  if (/^https?:\/\//i.test(config.saluran || '')) out.push(btn.url('Saluran Resmi', config.saluran))
  const wa = String(config.owner_wa || '').replace(/\D/g, '')
  if (wa.length >= 8) out.push(btn.url('Hubungi Owner', `https://wa.me/${wa}`))
  return out
}

function navButtons(prefix, { withHome = false } = {}) {
  const rows = [
    ...(withHome ? [{ header: 'Menu', title: '🏠 Beranda', description: 'Kembali ke menu utama', id: `${prefix}menu` }] : []),
    ...categoryRows(prefix),
    ...actionRows(prefix),
  ]
  const links = linkButtons()
  return [...links, btn.list(links.length ? 'Command' : '📂 LIHAT MENU', [{ title: 'PILIH MENU', rows }])]
}

// gambar header opsional: media/menu.jpg di folder project, atau "menu_image" (URL https) di config.json
function menuImage() {
  try {
    const file = path.join(ROOT, 'media', 'menu.jpg')
    if (fs.existsSync(file)) return fs.readFileSync(file)
  } catch {}
  return /^https?:\/\//i.test(config.menu_image || '') ? { url: config.menu_image } : null
}

function homeText(m) {
  const prefix = m.prefix || '/'
  const namaBot = config.nama_ai || 'Nova AI'
  const total = MENU_SECTIONS.reduce((n, s) => n + s.items.length, 0)
  const out = [
    heading(namaBot),
    kv('salam', `Selamat ${getGreeting()}, ${m.pushName || 'Kak'}`),
    kv('owner', 'Axel'),
    kv('prefix', prefix),
    kv('total', `${total} command`),
    kv('kategori', String(CATEGORIES.length)),
    '',
    heading('kategori'),
    ...CATEGORIES.map((c) => item(`${c.icon} ${c.label} — ${c.section.items.length} fitur`)),
    '',
    line,
    '📂 Tekan tombol di bawah untuk membuka daftar perintah.',
  ]
  return out.join('\n')
}

function categoryText(m, cat) {
  const prefix = m.prefix || '/'
  const out = [heading(`${cat.icon} ${cat.label}`), kv('fitur', `${cat.section.items.length} command`), '']
  for (const [cmd, alias, desc] of cat.section.items) {
    const al = alias === '-' ? '' : ` _(${alias.split(' | ').slice(0, 3).join(' | ')}${alias.split(' | ').length > 3 ? ' …' : ''})_`
    out.push(item(`*${prefix}${cmd}*${al}`), `   ${desc}`)
  }
  out.push('', line, '📂 Pilih kategori lain lewat tombol di bawah.')
  return out.join('\n')
}

async function sendCard(m, sock, body, buttons, fallbackText) {
  if (typeof sock?.sendButtons === 'function') {
    try {
      const img = menuImage()
      await sock.sendButtons(m.chat, {
        text: body,
        footer: `${config.nama_ai || 'Nova AI'} • Axel`,
        buttons,
        ...(img ? { image: img } : {}),
      }, { quoted: m })
      return
    } catch (e) {
      console.error('[MENU] gagal kirim kartu bertombol, pakai teks biasa:', e.message)
    }
  }
  await m.reply(fallbackText)
}

async function handler(m, { sock, args } = {}) {
  const prefix = m.prefix || '/'
  const sub = String(args?.[0] || '').toLowerCase()

  // daftar lengkap = tampilan teks lama (tidak diubah): .allmenu / .menu1 / .menu all
  if (['allmenu', 'menu1'].includes(m.command) || sub === 'all') {
    return m.reply(buildMenuText(m))
  }

  const cat = sub ? findCategory(sub) : null
  if (cat) {
    return sendCard(m, sock, categoryText(m, cat), navButtons(prefix, { withHome: true }), buildMenuText(m))
  }
  // tanpa argumen / argumen tidak dikenal -> beranda
  return sendCard(m, sock, homeText(m), navButtons(prefix), buildMenuText(m))
}

export { pluginConfig as config, handler }
