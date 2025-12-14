# 🚀 Deployment Guide

## Deploy ke OpenWrt (Recommended)

Untuk deploy di STB HG680P atau OpenWrt lainnya, lihat:

**[📖 Panduan OpenWrt](OPENWRT.md)**

## Deploy ke PC/Server (Systemd)

Untuk deploy di PC Linux dengan systemd:

### Quick Setup
```bash
sudo ./setup-service.sh
```

### Manual Setup
```bash
sudo cp hmonn-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable hmonn-bot
sudo systemctl start hmonn-bot
```

### Commands
```bash
sudo systemctl status hmonn-bot     # Status
sudo systemctl stop hmonn-bot       # Stop
sudo systemctl restart hmonn-bot    # Restart
sudo journalctl -u hmonn-bot -f     # Logs
```

## ⚠️ Tidak Bisa di Cloud

Bot ini **tidak dapat** di-deploy ke:
- ❌ Cloudflare Workers
- ❌ Vercel/Railway
- ❌ Heroku

Karena memerlukan akses ke modem di jaringan lokal (192.168.8.1).
