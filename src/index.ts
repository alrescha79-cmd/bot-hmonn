import { Telegraf, Context } from "telegraf";
import { message } from "telegraf/filters";
import {
  getWanIP,
  getWanIPWithAuth,
  changeIP,
  checkConnection,
  login,
  autoLogin,
  ModemInfo,
} from "./modem";
import {
  homeMenu,
  configMenu,
  confirmChangeIP,
  backToHomeButton,
} from "./keyboard";
import {
  updateIPChange,
  getLastIPInfo,
  saveCredentials,
  getCredentials,
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

// Session storage for multi-step conversations
const userSessions = new Map<number, any>();

/**
 * Get user session
 */
function getSession(userId: number) {
  if (!userSessions.has(userId)) {
    userSessions.set(userId, {});
  }
  return userSessions.get(userId);
}

/**
 * Clear user session
 */
function clearSession(userId: number) {
  userSessions.delete(userId);
}

/**
 * Get modem info with stored timestamp
 */
async function getModemInfoWithTimestamp(): Promise<ModemInfo> {
  const info = await getWanIPWithAuth();
  const lastInfo = await getLastIPInfo();
  
  if (lastInfo.timestamp) {
    info.timestamp = lastInfo.timestamp;
  }
  
  return info;
}

/**
 * Command: /start
 */
bot.start(async (ctx) => {
  try {
    const username = ctx.from?.username || ctx.from?.first_name;
    
    // Try to get modem info, but don't wait too long
    let info: ModemInfo;
    try {
      info = await Promise.race([
        getModemInfoWithTimestamp(),
        new Promise<ModemInfo>((resolve) => 
          setTimeout(() => resolve({
            name: "Huawei B312",
            wan_ip: "Checking...",
            timestamp: undefined
          }), 5000)
        )
      ]);
    } catch (error) {
      // Fallback if modem not accessible
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
    
    const username = ctx.from?.username || ctx.from?.first_name;
    let info: ModemInfo;
    
    try {
      info = await Promise.race([
        getModemInfoWithTimestamp(),
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
 * Action: Check Status
 */
bot.action("check_status", async (ctx) => {
  try {
    await ctx.answerCbQuery("Mengecek status modem...");
    
    const isConnected = await checkConnection();
    const info = await getModemInfoWithTimestamp();

    const statusText = `📊 **Status Modem**

Status Koneksi: ${isConnected ? "✅ Terhubung" : "❌ Tidak Terhubung"}
Nama Modem: ${info.name}
IP WAN: ${info.wan_ip}
Terakhir Diganti: ${info.timestamp || "-"}`;

    await ctx.editMessageText(statusText, {
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
    
    const infoText = `ℹ️ **Informasi Modem**

Model: Huawei B312
Fungsi: LTE Mobile Router
API: Huawei HiLink API

**Fitur Bot:**
- Monitoring IP WAN real-time
- Ganti IP dengan reconnect
- Login ke modem
- Tracking perubahan IP`;

    await ctx.editMessageText(infoText, {
      reply_markup: backToHomeButton(),
      parse_mode: "Markdown",
    });
  } catch (error: any) {
    await ctx.reply(`❌ Error: ${error.message}`);
  }
});

/**
 * Action: Login - Start login flow
 */
bot.action("login", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    
    const session = getSession(ctx.from.id);
    session.waitingFor = "username";

    await ctx.reply("🔐 **Login ke Modem**\n\nMasukkan username modem:", {
      parse_mode: "Markdown",
    });
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
    await ctx.editMessageText("⏳ Sedang mengganti IP...\n\nProses ini memakan waktu ~10 detik.");

    // Execute IP change
    const newInfo = await changeIP();
    
    // Save to storage
    await updateIPChange(newInfo);

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
    clearSession(ctx.from.id);
    
    const info = await getModemInfoWithTimestamp();
    const username = ctx.from?.username || ctx.from?.first_name;
    const menu = homeMenu(info, username);

    await ctx.reply(menu.text, {
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
  const session = getSession(ctx.from.id);

  try {
    // Login flow - waiting for username
    if (session.waitingFor === "username") {
      session.username = ctx.message.text;
      session.waitingFor = "password";
      await ctx.reply("Masukkan password modem:");
      return;
    }

    // Login flow - waiting for password
    if (session.waitingFor === "password") {
      const username = session.username;
      const password = ctx.message.text;

      await ctx.reply("⏳ Mencoba login ke modem...");

      try {
        const success = await login(username, password);

        if (success) {
          // Save credentials
          await saveCredentials(username, password);
          
          await ctx.reply("✅ Login berhasil!\n\nCredentials telah disimpan.", {
            reply_markup: backToHomeButton(),
          });
        } else {
          await ctx.reply("❌ Login gagal. Username atau password salah.", {
            reply_markup: backToHomeButton(),
          });
        }
      } catch (error: any) {
        await ctx.reply(`❌ ${error.message}`, {
          reply_markup: backToHomeButton(),
        });
      }

      // Clear session
      clearSession(ctx.from.id);
      return;
    }

    // No active session - show help
    await ctx.reply(
      "Gunakan /start untuk memulai atau pilih menu yang tersedia."
    );
  } catch (error: any) {
    await ctx.reply(`❌ Error: ${error.message}`);
    clearSession(ctx.from.id);
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
    console.log("🎯 Bot ready to receive commands");
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
  } catch (e) {}
  process.exit(0);
});

process.once("SIGTERM", () => {
  console.log("\n⏹️ Stopping bot...");
  try {
    bot.stop("SIGTERM");
  } catch (e) {}
  process.exit(0);
});
