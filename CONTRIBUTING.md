# Contributing to Bot Huawei B312 IP Monitor

Terima kasih atas kontribusi Anda! 🎉

## 🚀 Quick Start

1. Fork repository ini
2. Clone fork Anda:
   ```bash
   git clone https://github.com/alrescha79-cmd/bot-hmonn.git
   cd bot-hmonn
   ```

3. Install dependencies:
   ```bash
   bun install
   ```

4. Setup environment:
   ```bash
   cp .env.example .env
   # Edit .env dengan credentials Anda
   ```

5. Buat branch baru:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📝 Development Guidelines

### Code Style
- Gunakan TypeScript
- Follow existing code structure
- Add comments untuk logic yang kompleks
- Test changes sebelum commit

### Commit Messages
Format:
```
type: subject

body (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Test updates
- `chore`: Maintenance tasks

Example:
```
feat: add auto-reconnect on connection loss

Implement automatic reconnection when modem connection is lost
```

### Testing
Sebelum submit PR:
```bash
# Test modem connection
bun test.ts

# Test bot
bun run dev
# Test di Telegram
```

### Pull Request Process

1. Update documentation jika perlu
2. Test semua perubahan
3. Update README.md jika ada fitur baru
4. Submit PR dengan deskripsi jelas
5. Link ke issue jika ada

## 🐛 Reporting Bugs

Saat melaporkan bug, sertakan:
- Deskripsi jelas tentang masalah
- Langkah-langkah reproduksi
- Expected behavior vs actual behavior
- Screenshot/logs jika ada
- Environment (OS, Bun version, modem model)

## 💡 Feature Requests

Feature requests sangat welcome! Buat issue dengan:
- Use case yang jelas
- Contoh implementasi (jika ada)
- Benefit untuk pengguna

## 📚 Resources

- [Telegraf Documentation](https://telegraf.js.org/)
- [Huawei API Reference](https://github.com/alrescha79-cmd/hmonn)
- [Bun Documentation](https://bun.sh/docs)

## ⚖️ License

Dengan berkontribusi, Anda setuju bahwa kontribusi Anda akan dilisensikan di bawah MIT License.

---

**Terima kasih telah berkontribusi! 🙏**
