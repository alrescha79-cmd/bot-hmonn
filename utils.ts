#!/usr/bin/env bun

/**
 * Utility commands for Huawei B312
 * Quick commands to test modem functions
 */

import { getWanIP, changeIP, getToken, checkConnection, login } from "./src/modem";

const command = process.argv[2];

async function main() {
  try {
    switch (command) {
      case "ip":
        console.log("📡 Getting WAN IP...");
        const info = await getWanIP();
        console.log(`✅ IP: ${info.wan_ip}`);
        break;

      case "token":
        console.log("🔑 Getting token...");
        const { token, session } = await getToken();
        console.log(`✅ Token: ${token}`);
        console.log(`   Session: ${session || "N/A"}`);
        break;

      case "change":
        console.log("🔄 Changing IP...");
        console.log("⏳ This will take ~10 seconds...");
        const newInfo = await changeIP();
        console.log(`✅ New IP: ${newInfo.wan_ip}`);
        console.log(`   Time: ${newInfo.timestamp}`);
        break;

      case "status":
        console.log("📊 Checking connection...");
        const isConnected = await checkConnection();
        console.log(`${isConnected ? "✅" : "❌"} Status: ${isConnected ? "Connected" : "Disconnected"}`);
        if (isConnected) {
          const statusInfo = await getWanIP();
          console.log(`   IP: ${statusInfo.wan_ip}`);
        }
        break;

      case "login":
        const username = process.argv[3] || "admin";
        const password = process.argv[4] || "admin";
        console.log(`🔐 Logging in as ${username}...`);
        const success = await login(username, password);
        console.log(`${success ? "✅" : "❌"} Login ${success ? "successful" : "failed"}`);
        break;

      default:
        console.log(`
🛠️  Huawei B312 Utility Commands

Usage: bun utils.ts <command> [args]

Commands:
  ip          Get current WAN IP
  token       Get authentication token
  change      Change IP (disconnect/reconnect)
  status      Check connection status
  login       Login to modem
              Usage: bun utils.ts login <username> <password>

Examples:
  bun utils.ts ip
  bun utils.ts change
  bun utils.ts login admin admin
        `);
        break;
    }
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
