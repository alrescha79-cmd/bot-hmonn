# 🤖 Telegram Bot Huawei B312 IP Monitor

Bot Telegram untuk monitoring dan mengganti IP WAN pada modem Huawei B312 secara otomatis. **Mendukung multi-user** - bisa dihosting secara publik dan digunakan oleh banyak pengguna dengan modem masing-masing.

[![Bun](https://img.shields.io/badge/Bun-1.3.4-black)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 👥 **Multi-User** | Setiap pengguna punya konfigurasi modem sendiri |
| 🔍 **Auto-Detect IP** | Deteksi otomatis IP modem di jaringan |
| 🔄 **Ganti IP WAN** | Scan jaringan (PLMN) untuk mendapatkan IP baru (~20 detik) |
| 📊 **Detail Modem** | Informasi lengkap: IP, Provider, Sinyal, Pemakaian Data |
| 📶 **Kualitas Sinyal** | Monitor RSSI dan kekuatan sinyal real-time |
| 📈 **Statistik Data** | Total unduhan, unggahan, dan pemakaian bulanan |
| ⚙️ **Konfigurasi Dinamis** | Setup IP, username, password via bot |
| 🔐 **Auto-Login** | Login otomatis dengan credentials tersimpan |
| 💾 **Penyimpanan Per-User** | Setiap user punya config file sendiri |
| 🛡️ **Error Handling** | Fallback graceful jika modem offline |

---

## 🎯 Multi-User Hosting

Bot ini dirancang untuk di-host secara publik dan digunakan oleh banyak pengguna:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   User A     │     │   User B     │     │   User C     │
│ Modem: 8.1   │     │ Modem: 1.1   │     │ Modem: 0.1   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                     ┌──────▼──────┐
                     │  Telegram   │
                     │    Bot      │
                     └──────┬──────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
        ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
        │ userA.json│ │ userB.json│ │ userC.json│
        └───────────┘ └───────────┘ └───────────┘
```

Setiap pengguna:
- Menyimpan konfigurasi modem sendiri (IP, username, password)
- Memiliki session terpisah
- Tidak mempengaruhi pengguna lain

---

## 📱 Preview Tampilan

### Setup Baru (Auto-Detect)
```
👋 Halo, username!

━━━━━━━━━━━━━━━━━━━━
🚀 SELAMAT DATANG
━━━━━━━━━━━━━━━━━━━━

Anda belum mengkonfigurasi modem.

Pilih metode konfigurasi:

[🔍 Deteksi Otomatis]
[✏️ Input Manual]
```

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
```

> 💡 **Catatan:** Konfigurasi modem (IP, username, password) sekarang diatur per-user melalui bot, bukan di `.env`.

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
4. Pilih **"Deteksi Otomatis"** atau **"Input Manual"** untuk setup modem
5. Masukkan username dan password modem
6. Selesai! Gunakan menu interaktif

---

## 🎮 Cara Penggunaan

### Setup Pertama Kali

1. Kirim `/start`
2. Bot akan menampilkan opsi setup:
   - **🔍 Deteksi Otomatis** - Bot scan IP modem umum (192.168.8.1, 192.168.1.1, dll)
   - **✏️ Input Manual** - Masukkan IP modem secara manual
3. Masukkan username modem (default: admin)
4. Masukkan password modem
5. Bot akan mencoba login dan menyimpan konfigurasi

### Menu Utama

| Tombol | Fungsi |
|--------|--------|
| 🔄 **Ganti IP** | Scan jaringan (PLMN) untuk IP baru (~20 detik) |
| 📊 **Detail** | Lihat informasi lengkap modem |
| ⚙️ **Pengaturan** | Konfigurasi dan reset |

### Menu Pengaturan

| Tombol | Fungsi |
|--------|--------|
| 🔧 **Konfigurasi Modem** | Setup ulang IP address, username, password |
| 🗑️ **Reset Konfigurasi** | Hapus konfigurasi dan mulai dari awal |
| ℹ️ **Informasi** | Lihat konfigurasi saat ini |

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
│   ├── index.ts       # Logic utama bot (multi-user handlers)
│   ├── modem.ts       # Huawei API client (stateless, per-user)
│   ├── keyboard.ts    # Menu Telegram
│   └── storage.ts     # Penyimpanan per-user
├── user_data/         # Config per-user (auto-created)
│   ├── .gitkeep
│   ├── 123456.json    # Config untuk user ID 123456
│   └── ...
├── docs/              # Dokumentasi
├── .env               # Bot token (tidak di-git)
├── bot.sh             # Script kontrol
└── storage.json       # [DEPRECATED] Legacy storage
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
- ✅ Password di-encode dengan SHA256 + Base64 saat login
- ✅ Session & token management per-user
- ✅ Penyimpanan lokal per-user (`user_data/*.json` tidak di-git)
- ✅ Isolasi penuh antar pengguna
- ✅ Konfigurasi `.gitignore` yang proper

---

## 🐛 Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Bot tidak merespons | Cek: `./bot.sh status` dan `./bot.sh logs` |
| Modem tidak ditemukan (auto-detect) | Pastikan terhubung ke jaringan yang sama dengan modem |
| Modem tidak terhubung (manual) | Test: `ping <IP_MODEM>` |
| Login error 125003 | Session token issue - tunggu sebentar, coba lagi |
| Login error 108006 | Password salah - reset konfigurasi dan setup ulang |
| IP tidak berubah | Normal jika ISP memberikan IP "sticky" |

### ⚠️ Catatan Penting tentang Ganti IP

Fitur ganti IP bekerja dengan **scan jaringan (PLMN)** yang menyebabkan modem disconnect dan reconnect.

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
