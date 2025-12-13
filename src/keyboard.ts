import { InlineKeyboardMarkup } from "telegraf/types";
import { ModemInfo } from "./modem";

/**
 * Home menu with modem info
 */
export function homeMenu(info: ModemInfo, username?: string): {
  text: string;
  reply_markup: InlineKeyboardMarkup;
} {
  const greeting = username ? `👋 Selamat datang, *${username}*!` : "👋 Selamat datang!";

  let statusText = `${greeting}

━━━━━━━━━━━━━━━━━━━━
📡 *INFORMASI MODEM*
━━━━━━━━━━━━━━━━━━━━

🏷️ Perangkat: *${info.name}*
🌐 Alamat IP: \`${info.wan_ip}\`
📶 Operator: *${info.provider || "-"}*
📊 Pemakaian: ${info.dataUsage || "-"}
🕐 IP Terakhir Diubah: ${info.timestamp ?? "_belum pernah_"}

━━━━━━━━━━━━━━━━━━━━`;

  return {
    text: statusText,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔄 Ganti IP", callback_data: "chg_ip" },
          { text: "📊 Detail", callback_data: "check_status" },
        ],
        [{ text: "⚙️ Pengaturan", callback_data: "cfg" }],
      ],
    },
  };
}

/**
 * Configuration menu
 */
export function configMenu(): {
  text: string;
  reply_markup: InlineKeyboardMarkup;
} {
  return {
    text: `━━━━━━━━━━━━━━━━━━━━
⚙️ *PENGATURAN*
━━━━━━━━━━━━━━━━━━━━

Pilih opsi pengaturan:`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔧 Konfigurasi Modem", callback_data: "setup_modem" }],
        [{ text: "🔐 Masuk ke Modem", callback_data: "login" }],
        [{ text: "ℹ️ Informasi Perangkat", callback_data: "info" }],
        [{ text: "🏠 Beranda", callback_data: "home" }],
      ],
    },
  };
}

/**
 * Cancel action keyboard
 */
export function cancelKeyboard(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [[{ text: "❌ Batal", callback_data: "cancel" }]],
  };
}

/**
 * Confirmation menu for IP change
 */
export function confirmChangeIP(): {
  text: string;
  reply_markup: InlineKeyboardMarkup;
} {
  return {
    text: `⚠️ **Konfirmasi Ganti IP**

Proses ini akan:
1. Disconnect koneksi modem
2. Reconnect untuk mendapat IP baru
3. Memakan waktu ~10 detik

Lanjutkan?`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Ya, Ganti IP", callback_data: "confirm_chg_ip" },
          { text: "❌ Batal", callback_data: "home" },
        ],
      ],
    },
  };
}

/**
 * Back to home button
 */
export function backToHomeButton(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [[{ text: "🏠 Kembali ke Menu", callback_data: "home" }]],
  };
}
