# 🚨 Catatan Penting tentang Login dan Token Modem

## Status Login

Modem Huawei B312 memerlukan autentikasi untuk beberapa fitur. Bot ini menggunakan sistem login otomatis dengan manajemen token.

## Huawei Token System

### Token Single-Use

> **Penting**: Huawei modem menggunakan sistem **token single-use**. Setiap POST request memerlukan token baru.

**Cara kerja:**
1. Login ke modem → token login digunakan dan dikonsumsi
2. Untuk POST berikutnya, ambil token baru dari `/api/webserver/SesTokInfo`
3. Gunakan token baru tersebut untuk request

### Error Codes

| Error Code | Arti | Solusi |
|------------|------|--------|
| 125003 | Token tidak valid | Ambil fresh token sebelum POST |
| 125002 | Session tidak valid | Re-login ke modem |
| 108003 | Terlalu banyak login | Tunggu beberapa menit |
| 108006 | Password salah | Cek konfigurasi credentials |

## Metode Ganti IP

Bot menggunakan **PLMN scan** (`/api/net/plmn-list`) untuk ganti IP:

```
GET /api/net/plmn-list
```

**Keuntungan:**
- GET request, tidak memerlukan handling token kompleks
- Menyebabkan modem scan jaringan → disconnect → reconnect
- ISP biasanya memberikan IP baru saat reconnect
- Metode yang sama dengan Python `huawei-lte-api`

## ✅ Fitur yang Tersedia

Bot dapat digunakan untuk:
- ✅ **Ganti IP** - Via PLMN scan (~20 detik)
- ✅ **Lihat Detail Modem** - IP, Provider, Sinyal
- ✅ **Statistik Data** - Upload/Download
- ✅ **Konfigurasi** - Setup credentials

## Troubleshooting

### Bot menampilkan "Login Required"
Ini normal jika modem belum login. Fitur ganti IP tetap berfungsi.

### Ganti IP gagal
1. Pastikan modem connected ke jaringan
2. Check log error di terminal
3. Coba login manual via http://192.168.8.1

### Error 108003 (Too many logins)
1. Tunggu beberapa menit
2. Restart bot
3. Jika masih error, restart modem

## Manual Login via Browser

Jika API login bermasalah:

1. Buka http://192.168.8.1 di browser
2. Login dengan username/password
3. Biarkan browser terbuka
4. Bot akan menggunakan session yang sama

---

**Update**: Metode ganti IP telah diubah ke PLMN scan yang lebih reliable tanpa memerlukan POST request.
