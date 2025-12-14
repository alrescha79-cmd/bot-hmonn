# 🚀 Panduan Setup Bot Telegram Huawei B312

## 📋 Langkah-langkah Setup

### 1. Install Dependencies
```bash
bun install
```

### 2. Konfigurasi Environment
Edit file `.env` dan isi dengan token bot Telegram Anda:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
MODEM_IP=192.168.8.1
MODEM_USERNAME=admin
MODEM_PASSWORD=admin
```

**Cara mendapatkan Bot Token:**
1. Buka [@BotFather](https://t.me/BotFather) di Telegram
2. Kirim `/newbot`
3. Ikuti instruksi untuk membuat bot
4. Copy token yang diberikan
5. Paste ke `.env`

### 3. Jalankan Bot

**Mode Development (dengan hot reload):**
```bash
bun run dev
```

**Mode Production:**
```bash
bun run start
```

## 🎯 Fitur Bot

### Menu Utama
- **🔧 Konfigurasi**: Menu pengaturan modem
  - Login ke modem
  - Info modem
- **🔄 Ganti IP**: Ganti IP WAN dengan reconnect
- **🔍 Cek Status**: Lihat status koneksi modem

### Cara Penggunaan
1. Start bot dengan command `/start`
2. Bot akan menampilkan IP WAN saat ini
3. Pilih "Ganti IP" untuk mendapatkan IP baru
4. Proses scan jaringan (PLMN) ~20 detik

## 🔧 Konfigurasi Modem

### Default Credentials Huawei B312
- **IP**: 192.168.8.1
- **Username**: admin
- **Password**: admin

Jika Anda sudah mengubah password modem, gunakan menu "Konfigurasi" > "Login ke Modem" di bot.

## 📝 Troubleshooting

### Bot tidak bisa connect ke modem
1. Pastikan modem hidup dan terhubung ke jaringan
2. Cek IP modem sudah benar (default: 192.168.8.1)
3. Pastikan komputer terhubung ke modem

### Gagal login ke modem
1. Pastikan username dan password benar
2. Coba reset modem ke factory settings
3. Gunakan credentials default

### IP tidak berubah setelah PLMN scan
1. Tunggu beberapa menit dan coba lagi
2. Provider mungkin memberikan IP yang sama (sticky IP)
3. Ini normal, bukan bug bot

## 🔐 Keamanan

- Token bot disimpan di `.env` (tidak di-commit ke git)
- Password modem di-encode dengan SHA256
- Credentials disimpan lokal di `storage.json`

## 📊 Storage

Bot menyimpan data lokal di `storage.json`:
- IP terakhir
- Timestamp perubahan IP
- Credentials login (jika disimpan)

## 🛠 Development

### Hot Reload
Bot sudah dikonfigurasi dengan hot reload. Setiap perubahan code akan otomatis restart bot.

### Log
Bot menampilkan log di console untuk debugging.

## 📚 Referensi

- [Huawei HiLink API](https://github.com/alrescha79-cmd/hmonn)
- [Telegraf Documentation](https://telegraf.js.org/)
- [Bun Documentation](https://bun.sh/docs)

## 💡 Tips

1. **Jangan spam tombol Ganti IP** - tunggu proses selesai
2. **Simpan credentials** untuk reconnect otomatis
3. **Monitor log** untuk debug masalah
4. **Backup storage.json** jika perlu keep history
