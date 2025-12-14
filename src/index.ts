import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import {
  getWanIP,
  getWanIPWithAuth,
  getFullModemInfo,
  getDetailedModemInfo,
  changeIP,
  checkConnection,
  login,
  autoDetectModemIP,
  testModemConnection,
  normalizeTimestamp,
  ModemInfo,
  ModemConfig,
  clearUserSession,
} from "./modem";
import {
  homeMenu,
  configMenu,
  confirmChangeIP,
  backToHomeButton,
  setupMethodMenu,
  welcomeNewUserMenu,
  confirmResetMenu,
} from "./keyboard";
import {
  getUserConfig,
  saveUserConfig,
  hasUserConfig,
  updateUserIPChange,
  getUserLastIPInfo,
  saveUserModemConfig,
  getUserModemConfig,
  deleteUserConfig,
  UserConfig,
} from "./storage";

// Validate environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN tidak ditemukan di .env");
  process.exit(1);
}

// Initialize bot with custom options to avoid Bun compatibility issues
const bot = new Telegraf(BOT_TOKEN, {
  telegram: {
    apiRoot: "https://api.telegram.org",
  },
});

// Conversation state storage for multi-step conversations
interface ConversationState {
  waitingFor?: "modem_ip" | "modem_username" | "modem_password";
  modemIP?: string;
  modemUsername?: string;
}

const userConversations = new Map<number, ConversationState>();

/**
 * Get conversation state for a user
 */
function getConversation(userId: number): ConversationState {
  if (!userConversations.has(userId)) {
    userConversations.set(userId, {});
  }
  return userConversations.get(userId)!;
}

/**
 * Clear conversation state for a user
 */
function clearConversation(userId: number): void {
  userConversations.delete(userId);
}

/**
 * Get modem config for a user
 * Returns null if not configured
 */
async function getModemConfigForUser(userId: number): Promise<ModemConfig | null> {
  const config = await getUserModemConfig(userId);
  if (config.ip && config.username && config.password) {
    return {
      ip: config.ip,
      username: config.username,
      password: config.password,
    };
  }
  return null;
}

/**
 * Get modem info with stored timestamp for a user
 */
async function getModemInfoWithTimestamp(userId: number): Promise<ModemInfo> {
  const modemConfig = await getModemConfigForUser(userId);
  if (!modemConfig) {
    return {
      name: "Belum Dikonfigurasi",
      wan_ip: "Setup modem terlebih dahulu",
    };
  }

  try {
    const info = await getFullModemInfo(modemConfig, userId);
    const lastInfo = await getUserLastIPInfo(userId);

    if (lastInfo.timestamp) {
      info.timestamp = normalizeTimestamp(lastInfo.timestamp);
    }

    return info;
  } catch (error) {
    return {
      name: "Huawei Modem",
      wan_ip: "Error getting info",
    };
  }
}

/**
 * Command: /start
 */
bot.start(async (ctx) => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    const username = ctx.from?.username || ctx.from?.first_name;

    // Check if user has configured modem
    const hasConfig = await hasUserConfig(userId);

    if (!hasConfig) {
      // New user - show welcome menu with setup options
      const menu = welcomeNewUserMenu(username);
      await ctx.reply(menu.text, {
        reply_markup: menu.reply_markup,
        parse_mode: "Markdown",
      });
      return;
    }

    // Existing user - show home menu with modem info
    let info: ModemInfo;
    try {
      info = await Promise.race([
        getModemInfoWithTimestamp(userId),
        new Promise<ModemInfo>((resolve) =>
          setTimeout(() => resolve({
            name: "Huawei B312",
            wan_ip: "Checking...",
            timestamp: undefined
          }), 5000)
        )
      ]);
    } catch (error) {
      info = {
        name: "Huawei B312",
        wan_ip: "Modem Offline",
        timestamp: undefined
      };
    }

    const menu = homeMenu(info, username);

    await ctx.reply(menu.text, {
      reply_markup: menu.reply_markup,
      parse_mode: "Markdown",
    });
  } catch (error: any) {
    await ctx.reply(`❌ Error: ${error.message || "Terjadi kesalahan"}`);
  }
});

/**
 * Action: Home
 */
bot.action("home", async (ctx) => {
  try {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;
    if (!userId) return;

    const username = ctx.from?.username || ctx.from?.first_name;

    // Check if user has configured modem
    const hasConfig = await hasUserConfig(userId);

    if (!hasConfig) {
      const menu = welcomeNewUserMenu(username);
      await ctx.editMessageText(menu.text, {
        reply_markup: menu.reply_markup,
        parse_mode: "Markdown",
      });
      return;
    }

    let info: ModemInfo;
    try {
      info = await Promise.race([
        getModemInfoWithTimestamp(userId),
        new Promise<ModemInfo>((resolve) =>
          setTimeout(() => resolve({
            name: "Huawei B312",
            wan_ip: "Checking...",
            timestamp: undefined
          }), 5000)
        )
      ]);
    } catch (error) {
      info = {
        name: "Huawei B312",
        wan_ip: "Modem Offline",
        timestamp: undefined
      };
    }

    const menu = homeMenu(info, username);

    await ctx.editMessageText(menu.text, {
      reply_markup: menu.reply_markup,
      parse_mode: "Markdown",
    });
  } catch (error: any) {
    await ctx.reply(`❌ Error: ${error.message || "Terjadi kesalahan"}`);
  }
});

/**
 * Action: Check Status / Lihat Detail
 */
bot.action("check_status", async (ctx) => {
  try {
    await ctx.answerCbQuery("Memuat detail modem...");

    const userId = ctx.from?.id;
    if (!userId) return;

    const modemConfig = await getModemConfigForUser(userId);
    if (!modemConfig) {
      await ctx.reply("❌ Modem belum dikonfigurasi. Gunakan /start untuk setup.");
      return;
    }

    const detail = await getDetailedModemInfo(modemConfig, userId);

    const detailText = `━━━━━━━━━━━━━━━━━━━━
📊 *DETAIL MODEM*
━━━━━━━━━━━━━━━━━━━━

🏷️ Perangkat: *${detail.deviceName}*
🌐 Alamat IP: \`${detail.wanIP}\`
📶 Operator: *${detail.provider}*

━━━━━━━━━━━━━━━━━━━━
📡 *KUALITAS SINYAL*
━━━━━━━━━━━━━━━━━━━━

${detail.signalStrength}
📊 RSSI: ${detail.rssi}

━━━━━━━━━━━━━━━━━━━━
📈 *STATISTIK DATA*
━━━━━━━━━━━━━━━━━━━━

⬇️ Total Unduhan: *${detail.totalDownload}*
⬆️ Total Unggahan: *${detail.totalUpload}*
📅 Pemakaian Bulan Ini: *${detail.monthUsage}*

━━━━━━━━━━━━━━━━━━━━`;

    await ctx.editMessageText(detailText, {
      reply_markup: backToHomeButton(),
      parse_mode: "Markdown",
    });
  } catch (error: any) {
    await ctx.reply(`❌ Error: ${error.message}`);
  }
});

/**
 * Action: Configuration Menu
 */
bot.action("cfg", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const menu = configMenu();

    await ctx.editMessageText(menu.text, {
      reply_markup: menu.reply_markup,
      parse_mode: "Markdown",
    });
  } catch (error: any) {
    await ctx.reply(`❌ Error: ${error.message}`);
  }
});

/**
 * Action: Info
 */
bot.action("info", async (ctx) => {
  try {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;
    if (!userId) return;

    const userConfig = await getUserConfig(userId);
    const modemIP = userConfig.modemIP || "Belum dikonfigurasi";
    const modemUsername = userConfig.modemUsername || "Belum dikonfigurasi";

    const infoText = `ℹ️ *Informasi*

━━━━━━━━━━━━━━━━━━━━
📡 *KONFIGURASI ANDA*
━━━━━━━━━━━━━━━━━━━━

🌐 IP Modem: \`${modemIP}\`
👤 Username: \`${modemUsername}\`
🔑 Password: \\*\\*\\*\\*\\*\\*

━━━━━━━━━━━━━━━━━━━━
🤖 *TENTANG BOT*
━━━━━━━━━━━━━━━━━━━━

Model: Huawei B312/B311/E5573
API: Huawei HiLink API

*Fitur:*
• Monitoring IP WAN real-time
• Ganti IP dengan PLMN scan
• Konfigurasi per-pengguna
• Auto-detect modem IP`;

    await ctx.editMessageText(infoText, {
      reply_markup: backToHomeButton(),
      parse_mode: "Markdown",
    });
  } catch (error: any) {
    await ctx.reply(`❌ Error: ${error.message}`);
  }
});

/**
 * Action: Setup Modem - Show method selection
 */
bot.action("setup_modem", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const menu = setupMethodMenu();

    await ctx.editMessageText(menu.text, {
      reply_markup: menu.reply_markup,
      parse_mode: "Markdown",
    });
  } catch (error: any) {
    await ctx.reply(`❌ Error: ${error.message}`);
  }
});

/**
 * Action: Setup Auto - Auto-detect modem IP
 */
bot.action("setup_auto", async (ctx) => {
  try {
    await ctx.answerCbQuery("Mencari modem...");

    const userId = ctx.from?.id;
    if (!userId) return;

    await ctx.editMessageText("🔍 *Mencari modem di jaringan...*\n\n_Mohon tunggu, proses ini membutuhkan beberapa detik..._", {
      parse_mode: "Markdown",
    });

    const result = await autoDetectModemIP();

    if (result) {
      const conversation = getConversation(userId);
      conversation.modemIP = result.ip;
      conversation.waitingFor = "modem_username";

      await ctx.editMessageText(
        `✅ *Modem Ditemukan!*\n\n` +
        `📡 IP: \`${result.ip}\`\n` +
        `🏷️ Device: *${result.deviceName}*\n\n` +
        `Masukkan username modem (default: admin):`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "❌ Batal", callback_data: "cancel" }]],
          },
        }
      );
    } else {
      await ctx.editMessageText(
        `❌ *Modem Tidak Ditemukan*\n\n` +
        `Tidak ada modem Huawei yang ditemukan di jaringan.\n\n` +
        `Pastikan:\n` +
        `• Anda terhubung ke jaringan yang sama dengan modem\n` +
        `• Modem dalam keadaan menyala\n\n` +
        `Coba input manual:`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "✏️ Input Manual", callback_data: "setup_manual" }],
              [{ text: "🔄 Coba Lagi", callback_data: "setup_auto" }],
              [{ text: "❌ Batal", callback_data: "cancel" }],
            ],
          },
        }
      );
    }
  } catch (error: any) {
    await ctx.reply(`❌ Error: ${error.message}`);
  }
});

/**
 * Action: Setup Manual - Manual input modem IP
 */
bot.action("setup_manual", async (ctx) => {
  try {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;
    if (!userId) return;

    const conversation = getConversation(userId);
    conversation.waitingFor = "modem_ip";

    await ctx.editMessageText(
      `✏️ *Setup Manual*\n\n` +
      `Masukkan IP Address modem:\n` +
      `(contoh: 192.168.8.1)`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "❌ Batal", callback_data: "cancel" }]],
        },
      }
    );
  } catch (error: any) {
    await ctx.reply(`❌ Error: ${error.message}`);
  }
});

/**
 * Action: Reset Config - Show confirmation
 */
bot.action("reset_config", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const menu = confirmResetMenu();

    await ctx.editMessageText(menu.text, {
      reply_markup: menu.reply_markup,
      parse_mode: "Markdown",
    });
  } catch (error: any) {
    await ctx.reply(`❌ Error: ${error.message}`);
  }
});

/**
 * Action: Confirm Reset - Execute reset
 */
bot.action("confirm_reset", async (ctx) => {
  try {
    await ctx.answerCbQuery("Menghapus konfigurasi...");

    const userId = ctx.from?.id;
    if (!userId) return;

    // Clear session and delete config
    clearUserSession(userId);
    await deleteUserConfig(userId);

    await ctx.editMessageText(
      `✅ *Konfigurasi Dihapus*\n\n` +
      `Konfigurasi modem Anda telah dihapus.\n\n` +
      `Gunakan /start untuk setup ulang.`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔧 Setup Ulang", callback_data: "setup_modem" }],
          ],
        },
      }
    );
  } catch (error: any) {
    await ctx.reply(`❌ Error: ${error.message}`);
  }
});

/**
 * Action: Change IP - Show confirmation
 */
bot.action("chg_ip", async (ctx) => {
  try {
    await ctx.answerCbQuery();

    const userId = ctx.from?.id;
    if (!userId) return;

    const modemConfig = await getModemConfigForUser(userId);
    if (!modemConfig) {
      await ctx.reply("❌ Modem belum dikonfigurasi. Gunakan /start untuk setup.");
      return;
    }

    const menu = confirmChangeIP();

    await ctx.editMessageText(menu.text, {
      reply_markup: menu.reply_markup,
      parse_mode: "Markdown",
    });
  } catch (error: any) {
    await ctx.reply(`❌ Error: ${error.message}`);
  }
});

/**
 * Action: Confirm Change IP - Execute IP change
 */
bot.action("confirm_chg_ip", async (ctx) => {
  try {
    await ctx.answerCbQuery("Memulai proses ganti IP...");

    const userId = ctx.from?.id;
    if (!userId) return;

    const modemConfig = await getModemConfigForUser(userId);
    if (!modemConfig) {
      await ctx.reply("❌ Modem belum dikonfigurasi. Gunakan /start untuk setup.");
      return;
    }

    await ctx.editMessageText("⏳ **Sedang mengganti IP...**\n\n🔄 Scanning jaringan (PLMN)...\n⏱️ Estimasi waktu: ~20 detik\n\n_Harap tunggu..._", {
      parse_mode: "Markdown",
    });

    // Execute IP change
    const newInfo = await changeIP(modemConfig, userId);

    // Save to storage
    await updateUserIPChange(userId, newInfo.wan_ip, newInfo.timestamp || "");

    const successText = `✅ **IP Berhasil Diganti!**

IP Baru: ${newInfo.wan_ip}
Waktu: ${newInfo.timestamp}

Koneksi telah aktif kembali.`;

    await ctx.editMessageText(successText, {
      reply_markup: backToHomeButton(),
      parse_mode: "Markdown",
    });
  } catch (error: any) {
    await ctx.editMessageText(`❌ **Gagal Mengganti IP**\n\n${error.message}`, {
      reply_markup: backToHomeButton(),
      parse_mode: "Markdown",
    });
  }
});

/**
 * Action: Cancel
 */
bot.action("cancel", async (ctx) => {
  try {
    await ctx.answerCbQuery("Dibatalkan");

    const userId = ctx.from?.id;
    if (!userId) return;

    clearConversation(userId);

    const hasConfig = await hasUserConfig(userId);

    if (!hasConfig) {
      const username = ctx.from?.username || ctx.from?.first_name;
      const menu = welcomeNewUserMenu(username);
      await ctx.editMessageText(menu.text, {
        reply_markup: menu.reply_markup,
        parse_mode: "Markdown",
      });
      return;
    }

    const info = await getModemInfoWithTimestamp(userId);
    const username = ctx.from?.username || ctx.from?.first_name;
    const menu = homeMenu(info, username);

    await ctx.editMessageText(menu.text, {
      reply_markup: menu.reply_markup,
      parse_mode: "Markdown",
    });
  } catch (error: any) {
    await ctx.reply(`❌ Error: ${error.message}`);
  }
});

/**
 * Handle text messages for multi-step flows
 */
bot.on(message("text"), async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const conversation = getConversation(userId);

  try {
    // Setup flow - waiting for modem IP
    if (conversation.waitingFor === "modem_ip") {
      const ip = ctx.message.text.trim();

      // Validate IP format
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(ip)) {
        await ctx.reply(
          "❌ Format IP tidak valid.\n\nContoh: 192.168.8.1\n\nMasukkan IP Address modem:",
          {
            reply_markup: {
              inline_keyboard: [[{ text: "❌ Batal", callback_data: "cancel" }]],
            },
          }
        );
        return;
      }

      // Test connection to modem
      await ctx.reply("⏳ Memeriksa koneksi ke modem...");

      const test = await testModemConnection(ip);

      if (!test.success) {
        await ctx.reply(
          `❌ Tidak dapat terhubung ke modem di ${ip}\n\n` +
          `Pastikan:\n` +
          `• IP address benar\n` +
          `• Anda terhubung ke jaringan yang sama\n` +
          `• Modem dalam keadaan menyala\n\n` +
          `Coba lagi:`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔍 Deteksi Otomatis", callback_data: "setup_auto" }],
                [{ text: "❌ Batal", callback_data: "cancel" }],
              ],
            },
          }
        );
        return;
      }

      conversation.modemIP = ip;
      conversation.waitingFor = "modem_username";

      await ctx.reply(
        `✅ *Modem Ditemukan!*\n\n` +
        `📡 IP: \`${ip}\`\n` +
        `🏷️ Device: *${test.deviceName}*\n\n` +
        `Masukkan username modem (default: admin):`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "❌ Batal", callback_data: "cancel" }]],
          },
        }
      );
      return;
    }

    // Setup flow - waiting for modem username
    if (conversation.waitingFor === "modem_username") {
      conversation.modemUsername = ctx.message.text.trim() || "admin";
      conversation.waitingFor = "modem_password";

      await ctx.reply(
        `✅ Username: \`${conversation.modemUsername}\`\n\nMasukkan password modem:`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "❌ Batal", callback_data: "cancel" }]],
          },
        }
      );
      return;
    }

    // Setup flow - waiting for modem password
    if (conversation.waitingFor === "modem_password") {
      const password = ctx.message.text.trim();

      if (!conversation.modemIP || !conversation.modemUsername) {
        await ctx.reply("❌ Terjadi kesalahan. Silakan mulai ulang dengan /start");
        clearConversation(userId);
        return;
      }

      await ctx.reply("⏳ Menyimpan konfigurasi dan mencoba login...");

      const modemConfig: ModemConfig = {
        ip: conversation.modemIP,
        username: conversation.modemUsername,
        password: password,
      };

      // Try to login
      const loginSuccess = await login(modemConfig, userId);

      if (!loginSuccess) {
        await ctx.reply(
          `❌ *Login Gagal*\n\n` +
          `Username atau password salah.\n\n` +
          `Coba lagi:`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔄 Coba Lagi", callback_data: "setup_modem" }],
                [{ text: "❌ Batal", callback_data: "cancel" }],
              ],
            },
          }
        );
        clearConversation(userId);
        return;
      }

      // Save config
      await saveUserModemConfig(
        userId,
        modemConfig.ip,
        modemConfig.username,
        modemConfig.password
      );

      await ctx.reply(
        `✅ *Konfigurasi Berhasil Disimpan!*\n\n` +
        `📡 IP: \`${modemConfig.ip}\`\n` +
        `👤 Username: \`${modemConfig.username}\`\n` +
        `🔑 Password: \`${"*".repeat(password.length)}\`\n\n` +
        `Konfigurasi akan digunakan untuk login otomatis selanjutnya.\n\n` +
        `Ketik /start untuk melihat menu utama.`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "🏠 Menu Utama", callback_data: "home" }]],
          },
        }
      );

      clearConversation(userId);
      return;
    }

    // No active conversation - show help
    await ctx.reply(
      "Gunakan /start untuk memulai atau pilih menu yang tersedia."
    );
  } catch (error: any) {
    await ctx.reply(`❌ Error: ${error.message}`);
    clearConversation(userId);
  }
});

/**
 * Error handler
 */
bot.catch((err: any, ctx: Context) => {
  console.error(`❌ Error for ${ctx.updateType}`, err?.message || err);
  try {
    ctx.reply("❌ Terjadi kesalahan. Silakan coba lagi.");
  } catch (e) {
    console.error("Failed to send error message:", e);
  }
});

/**
 * Start bot
 */
async function startBot() {
  try {
    console.log("🤖 Starting Telegram Bot...");
    console.log("📡 Connecting to Telegram API...");

    // Get bot info first
    const botInfo = await bot.telegram.getMe();
    console.log(`✅ Connected as @${botInfo.username}`);
    console.log("✅ Bot is running!");
    console.log("🎯 Multi-user mode enabled");
    console.log("📝 Use /start to begin\n");

    // Start polling with error handling
    await bot.launch({
      dropPendingUpdates: true,
      allowedUpdates: ["message", "callback_query"],
    }).catch((err) => {
      // Ignore readonly property error from Telegraf internals
      if (err?.message?.includes("readonly property")) {
        console.log("⚠️ Ignoring Telegraf internal error (bot should still work)");
        return;
      }
      throw err;
    });

    console.log("📡 Polling started successfully\n");

  } catch (error: any) {
    console.error("❌ Failed to start bot:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
}

startBot();

// Enable graceful stop
process.once("SIGINT", () => {
  console.log("\n⏹️ Stopping bot...");
  try {
    bot.stop("SIGINT");
  } catch (e) { }
  process.exit(0);
});

process.once("SIGTERM", () => {
  console.log("\n⏹️ Stopping bot...");
  try {
    bot.stop("SIGTERM");
  } catch (e) { }
  process.exit(0);
});
