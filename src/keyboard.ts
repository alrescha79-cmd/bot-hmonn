import { InlineKeyboardMarkup } from "telegraf/types";
import { ModemInfo } from "./modem";

/**
 * Home menu with modem info
 */
export function homeMenu(info: ModemInfo, username?: string): {
  text: string;
  reply_markup: InlineKeyboardMarkup;
} {
  const greeting = username ? `Halo @${username}` : "Halo";
  
  return {
    text: `${greeting}

Nama Modem: ${info.name}
IP Sekarang: ${info.wan_ip}
IP berubah: ${info.timestamp ?? "-"}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔧 Konfigurasi", callback_data: "cfg" }],
        [{ text: "🔄 Ganti IP", callback_data: "chg_ip" }],
        [{ text: "🔍 Cek Status", callback_data: "check_status" }],
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
    text: `⚙️ **Konfigurasi Modem**

Pilih opsi konfigurasi:`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔐 Login ke Modem", callback_data: "login" }],
        [{ text: "ℹ️ Info Modem", callback_data: "info" }],
        [{ text: "🏠 Kembali", callback_data: "home" }],
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
