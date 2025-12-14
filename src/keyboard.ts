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
        [{ text: "🗑️ Reset Konfigurasi", callback_data: "reset_config" }],
        [{ text: "ℹ️ Informasi Perangkat", callback_data: "info" }],
        [{ text: "🏠 Beranda", callback_data: "home" }],
      ],
    },
  };
}

/**
 * Setup method selection menu (auto-detect vs manual)
 */
export function setupMethodMenu(): {
  text: string;
  reply_markup: InlineKeyboardMarkup;
} {
  return {
    text: `⚙️ *SETUP MODEM*

Pilih metode konfigurasi:

🔍 *Deteksi Otomatis*
Bot akan mencari modem di jaringan secara otomatis.

✏️ *Input Manual*
Masukkan IP address modem secara manual.`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔍 Deteksi Otomatis", callback_data: "setup_auto" }],
        [{ text: "✏️ Input Manual", callback_data: "setup_manual" }],
        [{ text: "❌ Batal", callback_data: "cancel" }],
      ],
    },
  };
}

/**
 * Welcome message for new users who need to setup modem
 */
export function welcomeNewUserMenu(username?: string): {
  text: string;
  reply_markup: InlineKeyboardMarkup;
} {
  const greeting = username ? `👋 Halo, *${username}*!` : "👋 Halo!";

  return {
    text: `${greeting}

━━━━━━━━━━━━━━━━━━━━
🚀 *SELAMAT DATANG*
━━━━━━━━━━━━━━━━━━━━

Anda belum mengkonfigurasi modem.

Untuk mulai menggunakan bot ini, silakan setup modem terlebih dahulu.

*Pilih metode konfigurasi:*`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔍 Deteksi Otomatis", callback_data: "setup_auto" }],
        [{ text: "✏️ Input Manual", callback_data: "setup_manual" }],
      ],
    },
  };
}

/**
 * Confirm reset configuration
 */
export function confirmResetMenu(): {
  text: string;
  reply_markup: InlineKeyboardMarkup;
} {
  return {
    text: `⚠️ *KONFIRMASI RESET*

Apakah Anda yakin ingin menghapus konfigurasi modem?

Anda perlu setup ulang setelah ini.`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Ya, Reset", callback_data: "confirm_reset" },
          { text: "❌ Batal", callback_data: "cfg" },
        ],
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
1. Scan jaringan (PLMN) untuk mendapatkan IP baru
2. Koneksi internet mungkin terputus sebentar

⏱️ Estimasi waktu: **~20 detik**

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
