# 🚀 Deploy ke OpenWrt (STB HG680P)

Deploy bot ke OpenWrt pada perangkat STB HG680P atau OpenWrt lainnya.

## Requirement

- OpenWrt dengan arsitektur **aarch64** (ARM Cortex-A53) atau sesuai
- Space disk: ~100MB
- RAM: ~50-100MB saat running
- Koneksi internet di OpenWrt
- Modem Huawei terhubung ke jaringan yang sama

## Quick Deploy

### 1. Build di PC (sudah selesai)

```bash
# Build TypeScript ke JavaScript
bun run build
```

Output: folder `dist/` berisi file JavaScript.

### 2. Transfer ke OpenWrt

```bash
# Dari PC, transfer ke OpenWrt via SCP
scp -r bot-hmonn root@<openwrt-ip>:/root/
```

### 3. Setup di OpenWrt

SSH ke OpenWrt:
```bash
ssh root@<openwrt-ip>
cd /root/bot-hmonn

# Setup .env
cp .env.example .env
vi .env  # Edit dengan token bot Anda

# Jalankan setup
sh openwrt/setup-openwrt.sh
```

## Manual Setup

Jika script otomatis tidak bekerja:

### Install Node.js
```bash
opkg update
opkg install node node-npm
```

### Install Dependencies
```bash
cd /root/bot-hmonn
npm install --production
```

### Install Service
```bash
cp openwrt/hmonn-bot /etc/init.d/
chmod +x /etc/init.d/hmonn-bot
/etc/init.d/hmonn-bot enable
/etc/init.d/hmonn-bot start
```

## Perintah Service

| Perintah | Fungsi |
|----------|--------|
| `/etc/init.d/hmonn-bot start` | Start bot |
| `/etc/init.d/hmonn-bot stop` | Stop bot |
| `/etc/init.d/hmonn-bot restart` | Restart bot |
| `/etc/init.d/hmonn-bot enable` | Auto-start saat boot |
| `/etc/init.d/hmonn-bot disable` | Disable auto-start |

## Lihat Logs

```bash
logread -f | grep node
```

## Struktur File di OpenWrt

```
/root/bot-hmonn/
├── dist/           # JavaScript (compiled)
│   ├── index.js
│   ├── modem.js
│   ├── keyboard.js
│   └── storage.js
├── .env            # Konfigurasi
├── storage.json    # Data persisten
└── openwrt/
    └── hmonn-bot   # Init script (copy ke /etc/init.d/)
```

## Troubleshooting

### Node.js tidak tersedia
```bash
opkg update
opkg list | grep node
# Install versi yang tersedia
```

### Memory tidak cukup
Bot membutuhkan ~50-100MB RAM. Cek dengan:
```bash
free -m
```

### Permission denied
```bash
chmod +x /etc/init.d/hmonn-bot
chmod +x openwrt/setup-openwrt.sh
```

### Bot tidak jalan setelah reboot
```bash
/etc/init.d/hmonn-bot enable
reboot
```
