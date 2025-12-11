# 🤖 Bot Telegram Huawei B312 - Quick Start

## ⚡ Setup Cepat

### 1. Install Dependencies
```bash
bun install
```

### 2. Konfigurasi Bot Token
Edit `.env`:
```bash
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

### 3. Jalankan Bot
```bash
bun run dev
```

## 🧪 Test Koneksi Modem

Sebelum menjalankan bot, test dulu koneksi ke modem:

```bash
bun test.ts
```

Output yang diharapkan:
```
🧪 Testing Huawei B312 Connection...

1️⃣ Testing connection to modem...
   Result: ✅ Connected

2️⃣ Testing token retrieval...
   Token: ✅ Retrieved

3️⃣ Testing WAN IP retrieval...
   Modem Name: Huawei B312
   WAN IP: 10.xx.xx.xx

✅ All tests passed!
```

## 📱 Cara Pakai Bot

1. Buka Telegram, cari bot Anda
2. Kirim `/start`
3. Bot akan menampilkan:
   ```
   Halo @username

   Nama Modem: Huawei B312
   IP Sekarang: 10.xx.xx.xx
   IP berubah: -

   [🔧 Konfigurasi] [🔄 Ganti IP] [🔍 Cek Status]
   ```

4. Klik **🔄 Ganti IP** untuk mengganti IP WAN
5. Tunggu ~10 detik
6. Bot akan memberitahu IP baru

## 🎯 Fitur

### Ganti IP
- Disconnect modem
- Reconnect untuk dapat IP baru
- Proses ~10 detik
- Otomatis save timestamp

### Konfigurasi
- Login ke modem (jika perlu autentikasi)
- Lihat info modem
- Credentials tersimpan otomatis

### Cek Status
- Status koneksi modem
- IP WAN saat ini
- Timestamp perubahan terakhir

## 🔧 Environment Variables

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `TELEGRAM_BOT_TOKEN` | - | Token dari @BotFather (WAJIB) |
| `MODEM_IP` | 192.168.8.1 | IP address modem |
| `MODEM_USERNAME` | admin | Username default modem |
| `MODEM_PASSWORD` | admin | Password default modem |

## 📂 File Structure

```
bot-hmonn/
├── src/
│   ├── index.ts      # Main bot logic
│   ├── modem.ts      # Huawei B312 API functions
│   ├── keyboard.ts   # Telegram keyboards/menus
│   └── storage.ts    # Local data storage
├── .env              # Environment configuration
├── test.ts           # Connection test script
└── package.json      # Dependencies
```

## 🐛 Troubleshooting

### Bot tidak respond
- Cek token bot sudah benar
- Pastikan bot sudah `/start` di Telegram
- Lihat log error di terminal

### Tidak bisa connect ke modem
- Pastikan modem hidup
- Cek IP modem (default: 192.168.8.1)
- Run `bun test.ts` untuk diagnosa

### IP tidak berubah
- Provider mungkin kasih IP yang sama
- Tunggu lebih lama
- Coba beberapa kali

## 💡 Tips

✅ Test koneksi modem dulu dengan `bun test.ts`  
✅ Gunakan mode dev untuk development  
✅ Lihat log di terminal untuk debugging  
✅ Simpan credentials untuk auto-login  
✅ Backup `storage.json` jika perlu history  

## 📞 Command List

| Command | Fungsi |
|---------|--------|
| `/start` | Mulai bot dan lihat menu utama |

## 🔄 Hot Reload

Bot sudah dikonfigurasi dengan hot reload:
- Edit code di `src/`
- Bot auto-restart
- Tidak perlu stop-start manual

## 🚀 Ready to Go!

```bash
# 1. Test modem connection
bun test.ts

# 2. Run bot with hot reload
bun run dev

# 3. Open Telegram and /start your bot
```

Happy coding! 🎉
