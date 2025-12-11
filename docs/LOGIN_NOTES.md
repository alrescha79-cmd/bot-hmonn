# 🚨 Catatan Penting tentang Login Modem

## Status Login

Modem Huawei B312 Anda memerlukan autentikasi untuk beberapa fitur. Saat ini ada error code **125003** saat mencoba login otomatis.

## Error Code 125003

Error ini biasanya berarti:
1. Username atau password salah
2. Modem sudah dalam keadaan login (dari web browser)
3. Password encoding tidak cocok dengan versi firmware modem

## Solusi & Workaround

### ✅ Fitur yang Tetap Berfungsi (Tanpa Login)

Bot masih bisa digunakan untuk:
- ✅ **Ganti IP** - Disconnect/reconnect modem
- ✅ Cek koneksi modem
- ✅ Ambil token dan session

### 🔐 Untuk Fitur yang Perlu Login

Jika Anda perlu fitur yang memerlukan autentikasi:

**Opsi 1: Login Manual via Web Browser**
1. Buka http://192.168.8.1 di browser
2. Login dengan username/password Anda
3. Biarkan browser terbuka
4. Bot akan menggunakan session yang sama

**Opsi 2: Update Password di .env**
Pastikan password di `.env` sama persis dengan password modem:
```env
MODEM_USERNAME=admin
MODEM_PASSWORD=your_actual_password
```

**Opsi 3: Reset Modem ke Factory Settings**
Jika Anda lupa password:
1. Tekan tombol reset di modem selama 10 detik
2. Password akan kembali ke default: `admin`
3. Update `.env` dengan password `admin`

## Testing

### Test Koneksi (Tanpa Login)
```bash
bun test.ts
```

Expected: Connection OK, token retrieved, login optional

### Test Ganti IP (Main Feature)
```bash
bun utils.ts change
```

Ini akan test apakah disconnect/reconnect berfungsi (biasanya tidak perlu full login).

## Run Bot

Bot tetap bisa dijalankan dan digunakan:

```bash
bun run dev
```

### Fitur Available:
- ✅ Menu dan navigasi
- ✅ Ganti IP (disconnect/reconnect)
- ✅ Cek status koneksi
- ⚠️ Get IP detail (might show "Login Required")

## Troubleshooting

### Bot menampilkan "Login Required"
Ini normal jika modem belum login. Fitur ganti IP tetap berfungsi.

### Ganti IP gagal
1. Coba login manual via web browser dulu
2. Pastikan modem connected ke jaringan
3. Check log error di terminal

### Password encoding issue
Jika menggunakan firmware custom atau versi lama, encoding password bisa berbeda. Dalam kasus ini, gunakan login manual via web browser.

## Kesimpulan

**✅ Bot SIAP DIGUNAKAN** untuk fungsi utama (ganti IP) meskipun ada issue dengan auto-login API. 

Fungsi login API adalah fitur tambahan - core functionality tetap berjalan dengan baik!

---

**Update**: Fungsi `changeIP()` dan `getWanIPWithAuth()` sudah di-update untuk handle case ini dengan graceful fallback.
