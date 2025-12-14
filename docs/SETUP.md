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
```

> 💡 **Catatan:** Konfigurasi modem (IP, username, password) sekarang diatur per-user melalui bot, bukan di `.env`.

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

### Multi-User Support 👥

Bot mendukung banyak pengguna dengan modem berbeda:

- Setiap user punya konfigurasi modem sendiri
- Konfigurasi disimpan di `user_data/{telegram_id}.json`
- User A tidak mempengaruhi user B

### Setup Pertama Kali

Saat pertama kali menggunakan bot:

1. Kirim `/start`
2. Pilih metode konfigurasi:
   - **🔍 Deteksi Otomatis** - Bot scan IP modem umum
   - **✏️ Input Manual** - Masukkan IP modem manual
3. Masukkan username modem (default: admin)
4. Masukkan password modem
5. Bot akan login dan menyimpan konfigurasi

### Menu Utama
- **🔄 Ganti IP**: Ganti IP WAN dengan PLMN scan (~20 detik)
- **📊 Detail**: Lihat info lengkap modem
- **⚙️ Pengaturan**: Konfigurasi dan reset

### Menu Pengaturan
- **🔧 Konfigurasi Modem**: Setup ulang IP, username, password
- **🗑️ Reset Konfigurasi**: Hapus konfigurasi dan mulai ulang
- **ℹ️ Informasi**: Lihat konfigurasi saat ini

## 🔧 Konfigurasi Modem

### Auto-Detect IP

Bot akan mencoba IP modem umum berikut:
- `192.168.8.1` (Huawei default)
- `192.168.1.1`
- `192.168.0.1`
- `192.168.100.1`
- `10.0.0.1`
- `192.168.2.1`
- `192.168.3.1`
- `192.168.31.1`

### Manual Input

Jika modem menggunakan IP lain:
1. Pilih "Input Manual" saat setup
2. Masukkan IP address modem
3. Bot akan test koneksi
4. Lanjutkan dengan username dan password

### Default Credentials Huawei B312
- **Username**: admin
- **Password**: admin

## 📝 Troubleshooting

### Bot tidak bisa connect ke modem
1. Pastikan modem hidup dan terhubung ke jaringan
2. Pastikan Anda terhubung ke jaringan yang sama dengan modem
3. Coba ping IP modem: `ping 192.168.8.1`

### Modem tidak ditemukan (Auto-Detect)
1. Pastikan terhubung ke WiFi/LAN modem
2. Modem mungkin menggunakan IP non-standard
3. Gunakan "Input Manual" dan masukkan IP yang benar

### Gagal login ke modem
1. Pastikan username dan password benar
2. Error 125003: Session issue - tunggu sebentar, coba lagi
3. Error 108006: Password salah - reset dan setup ulang
4. Tutup browser yang mengakses modem (konflik session)

### IP tidak berubah setelah PLMN scan
1. Tunggu beberapa menit dan coba lagi
2. Provider mungkin memberikan IP yang sama (sticky IP)
3. Ini normal, bukan bug bot

## 🔐 Keamanan

- Token bot disimpan di `.env` (tidak di-commit ke git)
- Password modem di-encode dengan SHA256 saat login
- Credentials disimpan per-user di `user_data/*.json`
- File `user_data/*.json` tidak di-commit ke git

## 📊 Storage

### Per-User Storage
Setiap user memiliki file config di `user_data/{telegram_id}.json`:

```json
{
  "modemIP": "192.168.8.1",
  "modemUsername": "admin",
  "modemPassword": "mypassword",
  "lastIP": "10.40.18.12",
  "lastChangeTimestamp": "14-12-2025, 12:30:00",
  "lastLoginAt": "2025-12-14T12:25:00.000Z"
}
```

### Legacy Storage (Deprecated)
File `storage.json` masih didukung untuk backwards compatibility, tapi tidak lagi digunakan untuk user baru.

## 🛠 Development

### Hot Reload
Bot sudah dikonfigurasi dengan hot reload. Setiap perubahan code akan otomatis restart bot.

### Log
Bot menampilkan log di console untuk debugging.

### Build
```bash
bun run build   # Compile TypeScript
bun run start   # Run compiled JS
bun run dev     # Development mode
```

## 📚 Referensi

- [Huawei HiLink API](https://github.com/alrescha79-cmd/hmonn)
- [Telegraf Documentation](https://telegraf.js.org/)
- [Bun Documentation](https://bun.sh/docs)

## 💡 Tips

1. **Jangan spam tombol Ganti IP** - tunggu proses selesai (~20 detik)
2. **Credentials tersimpan otomatis** setelah setup berhasil
3. **Monitor log** untuk debug masalah: `./bot.sh logs`
4. **Reset konfigurasi** jika ingin ganti modem
5. **Multiple users** bisa menggunakan bot yang sama untuk modem berbeda
