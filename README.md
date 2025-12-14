# 🤖 Telegram Bot Huawei B312 IP Monitor

Bot Telegram untuk monitoring dan mengganti IP WAN pada modem Huawei B312 secara otomatis.

[![Bun](https://img.shields.io/badge/Bun-1.3.4-black)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 🔄 **Ganti IP WAN** | Scan jaringan (PLMN) untuk mendapatkan IP baru (~20 detik) |
| 📊 **Detail Modem** | Informasi lengkap: IP, Provider, Sinyal, Pemakaian Data |
| 📶 **Kualitas Sinyal** | Monitor RSSI dan kekuatan sinyal real-time |
| 📈 **Statistik Data** | Total unduhan, unggahan, dan pemakaian bulanan |
| ⚙️ **Konfigurasi Dinamis** | Setup IP, username, password via bot |
| 🔐 **Auto-Login** | Login otomatis dengan session & token management |
| 💾 **Penyimpanan Lokal** | Simpan konfigurasi dan timestamp perubahan IP |
| 🛡️ **Error Handling** | Fallback graceful jika modem offline |

---

## 📱 Preview Tampilan

### Menu Utama
```
👋 Selamat datang, username!

━━━━━━━━━━━━━━━━━━━━
📡 INFORMASI MODEM
━━━━━━━━━━━━━━━━━━━━

🏷️ Perangkat: B312-926
🌐 Alamat IP: 10.40.18.12
📶 Operator: Telkomsel
📊 Pemakaian: ⬇️ 2.93 GB / ⬆️ 416 MB
🕐 IP Terakhir Diubah: 14-12-2024, 12:30:00

━━━━━━━━━━━━━━━━━━━━
```

### Detail Modem
```
━━━━━━━━━━━━━━━━━━━━
📊 DETAIL MODEM
━━━━━━━━━━━━━━━━━━━━

🏷️ Perangkat: B312-926
🌐 Alamat IP: 10.40.18.12
📶 Operator: Telkomsel

━━━━━━━━━━━━━━━━━━━━
📡 KUALITAS SINYAL
━━━━━━━━━━━━━━━━━━━━

📶 Bagus
📊 RSSI: -73dBm

━━━━━━━━━━━━━━━━━━━━
📈 STATISTIK DATA
━━━━━━━━━━━━━━━━━━━━

⬇️ Total Unduhan: 2.93 GB
⬆️ Total Unggahan: 416 MB
📅 Pemakaian Bulan Ini: 3.2 GB

━━━━━━━━━━━━━━━━━━━━
```

---

## 🚀 Instalasi

### 1. Install Dependencies
```bash
bun install
```

### 2. Konfigurasi Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
MODEM_IP=192.168.8.1
MODEM_USERNAME=admin
MODEM_PASSWORD=your_password
```

> 💡 **Mendapatkan Bot Token:**
> 1. Buka [@BotFather](https://t.me/BotFather) di Telegram
> 2. Kirim `/newbot`
> 3. Ikuti instruksi
> 4. Copy token ke `.env`

### 3. Jalankan Bot
```bash
# Development (dengan hot reload)
bun run dev

# Production
bun run start

# Menggunakan control script
./bot.sh start
```

### 4. Gunakan Bot
1. Buka Telegram
2. Cari bot Anda
3. Kirim `/start`
4. Gunakan menu interaktif

---

## 🎮 Cara Penggunaan

### Menu Utama

| Tombol | Fungsi |
|--------|--------|
| 🔄 **Ganti IP** | Scan jaringan (PLMN) untuk IP baru (~20 detik) |
| 📊 **Detail** | Lihat informasi lengkap modem |
| ⚙️ **Pengaturan** | Konfigurasi dan login modem |

### Menu Pengaturan

| Tombol | Fungsi |
|--------|--------|
| 🔧 **Konfigurasi Modem** | Setup IP address, username, password |
| 🔐 **Masuk ke Modem** | Login manual ke modem |
| ℹ️ **Informasi Perangkat** | Detail perangkat modem |

---

## 📡 API Endpoints (Huawei B312)

Bot ini menggunakan Huawei HiLink API:

| Endpoint | Data |
|----------|------|
| `/api/device/information` | Nama perangkat, IP WAN, IMEI |
| `/api/net/current-plmn` | Nama operator/provider |
| `/api/net/plmn-list` | **Scan jaringan (untuk ganti IP)** |
| `/api/device/signal` | Kekuatan sinyal (RSSI, RSRP) |
| `/api/monitoring/traffic-statistics` | Total upload/download |
| `/api/monitoring/month_statistics` | Statistik bulanan |
| `/api/user/login` | Autentikasi |
| `/api/dialup/mobile-dataswitch` | On/off koneksi data |

---

## 📦 Struktur Proyek

```
bot-hmonn/
├── src/
│   ├── index.ts       # Logic utama bot
│   ├── modem.ts       # Huawei B312 API client
│   ├── keyboard.ts    # Menu Telegram
│   └── storage.ts     # Penyimpanan data lokal
├── docs/              # Dokumentasi
├── .env               # Konfigurasi (tidak di-git)
├── bot.sh             # Script kontrol
└── storage.json       # Data persisten
```

---

## 🧪 CLI Tools

```bash
# Kontrol bot
./bot.sh start         # Jalankan bot
./bot.sh stop          # Hentikan bot
./bot.sh restart       # Restart bot
./bot.sh status        # Cek status
./bot.sh logs          # Lihat log
```

---

## 🔐 Keamanan

- ✅ Token bot disimpan di `.env` (tidak di-commit ke git)
- ✅ Password di-encode dengan SHA256 + Base64
- ✅ Session & token management dari response headers
- ✅ Penyimpanan lokal (tanpa database eksternal)
- ✅ Konfigurasi `.gitignore` yang proper

---

## 🐛 Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Bot tidak merespons | Cek: `./bot.sh status` dan `./bot.sh logs` |
| Modem tidak terhubung | Test: `ping 192.168.8.1` |
| Login error 125003 | Session token issue - tutup browser yang mengakses modem |
| Login error 108006 | Password salah - cek konfigurasi |
| IP tidak berubah | Normal jika ISP memberikan IP "sticky" |

### ⚠️ Catatan Penting tentang Ganti IP

Fitur ganti IP bekerja dengan **scan jaringan (PLMN)** yang menyebabkan modem disconnect dan reconnect. Metode ini sama dengan yang digunakan di library Python `huawei-lte-api`.

**Catatan:**
- Proses memakan waktu ~20 detik
- Beberapa ISP memberikan IP yang sama (sticky IP) meskipun sudah reconnect
- Ini adalah perilaku normal dari ISP, bukan bug bot

---

## 🛠 Tech Stack

- **[Bun](https://bun.sh)** - JavaScript runtime yang cepat
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Telegraf](https://telegraf.js.org/)** - Telegram bot framework
- **[Axios](https://axios-http.com/)** - HTTP client untuk Huawei API

---

## 📖 Dokumentasi

Dokumentasi lengkap tersedia di folder [`docs/`](docs/):

- [Quick Start Guide](docs/QUICKSTART.md)
- [Setup Guide](docs/SETUP.md)
- [**OpenWrt Deployment**](docs/OPENWRT.md) - Deploy ke STB HG680P
- [Deployment Guide](docs/DEPLOYMENT.md) - Deploy options
- [Login Troubleshooting](docs/LOGIN_NOTES.md)
- [Build Summary](docs/BUILD_SUMMARY.md)

---

## 📝 License

MIT License - lihat file [LICENSE](LICENSE) untuk detail.

---

## 🙏 Credits

- Bot framework: [Telegraf](https://telegraf.js.org/)
- Huawei API reference: [huawei-lte-api](https://github.com/Salamek/huawei-lte-api)
- Runtime: [Bun](https://bun.sh)

---

**Made with ❤️ for Huawei B312 users by [@Alrescha79](https://github.com/alrescha79-cmd)**
