# 🤖 Telegram Bot Huawei B312 IP Monitor

Bot Telegram untuk monitoring dan mengganti IP WAN pada modem Huawei B312 secara otomatis.

[![Bun](https://img.shields.io/badge/Bun-1.3.4-black)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## ✨ Features

- 🔄 **Ganti IP WAN** - Disconnect/reconnect modem untuk IP baru
- 📊 **Cek Status** - Monitor status koneksi real-time
- 💾 **Storage** - Auto-save timestamp perubahan IP
- 🎨 **Interactive UI** - Inline keyboard yang user-friendly
- 🔐 **Authentication** - Login support untuk modem
- ⚡ **Hot Reload** - Development mode dengan auto-restart
- 🛡️ **Error Handling** - Graceful fallback jika modem offline

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Configure Environment
Copy `.env.example` to `.env` dan edit:
```bash
cp .env.example .env
```

Edit `.env`:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
MODEM_IP=192.168.8.1
MODEM_USERNAME=admin
MODEM_PASSWORD=admin
```

**Get Bot Token:**
1. Open [@BotFather](https://t.me/BotFather) in Telegram
2. Send `/newbot`
3. Follow instructions
4. Copy token to `.env`

### 3. Test Connection
```bash
bun test.ts
```

### 4. Start Bot
```bash
# Development (with hot reload)
bun run dev

# Production
bun run start

# Using control script
./bot.sh start
```

### 5. Use Bot
1. Open Telegram
2. Search your bot
3. Send `/start`
4. Click **🔄 Ganti IP** to change IP

---

## 📖 Documentation

Dokumentasi lengkap tersedia di folder [`docs/`](docs/):

- **[Quick Start Guide](docs/QUICKSTART.md)** - Panduan cepat penggunaan
- **[Setup Guide](docs/SETUP.md)** - Panduan instalasi lengkap
- **[Login Troubleshooting](docs/LOGIN_NOTES.md)** - Solusi masalah autentikasi
- **[Build Summary](docs/BUILD_SUMMARY.md)** - Detail teknis build
- **[Status](docs/STATUS.md)** - Status deployment

## 🛠 Technology Stack

- **[Bun](https://bun.sh)** - Fast JavaScript runtime
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Telegraf](https://telegraf.js.org/)** - Telegram bot framework
- **[Axios](https://axios-http.com/)** - HTTP client

---

## 📱 Bot Usage

### Commands
| Command | Description |
|---------|-------------|
| `/start` | Start bot and show main menu |

### Main Features

**🔄 Change IP**
1. Click "🔄 Ganti IP"
2. Confirm action
3. Wait ~10 seconds
4. Get new IP address

**🔍 Check Status**
- Connection status
- Current WAN IP
- Last change timestamp

**🔧 Configuration**
- Login to modem
- View modem info
- Save credentials

---

## 🧪 CLI Tools

### Test Modem Connection
```bash
bun test.ts
```

### Utilities
```bash
# Get current IP
bun utils.ts ip

# Change IP
bun utils.ts change

# Check status
bun utils.ts status

# Login to modem
bun utils.ts login admin password
```

### Bot Control Script
```bash
./bot.sh start      # Start bot
./bot.sh stop       # Stop bot
./bot.sh restart    # Restart bot
./bot.sh status     # Check status
./bot.sh logs       # View logs
```

---

## 📦 Project Structure

```
bot-hmonn/
├── src/
│   ├── index.ts       # Main bot logic
│   ├── modem.ts       # Huawei B312 API
│   ├── keyboard.ts    # Telegram menus
│   └── storage.ts     # Data storage
├── docs/              # Documentation
├── .env               # Configuration
├── bot.sh             # Control script
├── test.ts            # Connection tests
└── utils.ts           # CLI utilities
```

---

## ⚙️ Configuration

Environment variables (`.env`):

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here  # Required
MODEM_IP=192.168.8.1                    # Default modem IP
MODEM_USERNAME=admin                     # Default username
MODEM_PASSWORD=admin                     # Default password
```

---

## 🔐 Security

- ✅ Bot token stored in `.env` (not committed to git)
- ✅ Password encoded with SHA256 for authentication
- ✅ Local storage only (no external databases)
- ✅ Proper `.gitignore` configuration

---

## 🐛 Troubleshooting

**Bot tidak merespons?**
- Check bot process: `./bot.sh status`
- Check logs: `./bot.sh logs`
- Restart bot: `./bot.sh restart`

**Modem tidak terhubung?**
- Cek IP modem: `ping 192.168.8.1`
- Test koneksi: `bun test.ts`
- Update MODEM_IP di `.env` jika perlu

**Login error 125003?**
- Login manual via browser: http://192.168.8.1
- Baca [Login Notes](docs/LOGIN_NOTES.md)
- Ganti IP tetap berfungsi tanpa login penuh

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🙏 Credits

- Bot framework: [Telegraf](https://telegraf.js.org/)
- Huawei API reference: [hmonn](https://github.com/alrescha79-cmd/hmonn)
- Runtime: [Bun](https://bun.sh)

---

## 📞 Support

Untuk pertanyaan atau issue:
- Check [documentation](docs/)
- Open an issue on GitHub
- Read [troubleshooting guide](docs/LOGIN_NOTES.md)

---

**Made with ❤️ for Huawei B312 users**
