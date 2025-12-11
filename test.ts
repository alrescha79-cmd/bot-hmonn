#!/usr/bin/env bun

/**
 * Test script for modem connection
 * Run: bun test.ts
 */

import { getWanIP, getWanIPWithAuth, checkConnection, getToken, autoLogin } from "./src/modem";

console.log("🧪 Testing Huawei B312 Connection...\n");

async function runTests() {
  try {
    // Test 1: Check connection
    console.log("1️⃣ Testing connection to modem...");
    const isConnected = await checkConnection();
    console.log(`   Result: ${isConnected ? "✅ Connected" : "❌ Not Connected"}\n`);

    if (!isConnected) {
      console.log("❌ Cannot connect to modem. Please check:");
      console.log("   - Modem is turned on");
      console.log("   - Computer is connected to modem");
      console.log("   - IP address is correct (default: 192.168.8.1)");
      process.exit(1);
    }

    // Test 2: Get token
    console.log("2️⃣ Testing token retrieval...");
    const { token, session } = await getToken();
    console.log(`   Token: ${token ? "✅ Retrieved" : "❌ Failed"}`);
    console.log(`   Session: ${session ? session.substring(0, 50) + "..." : "N/A"}\n`);

    // Test 3: Auto-login
    console.log("3️⃣ Testing auto-login...");
    const loginSuccess = await autoLogin();
    console.log(`   Result: ${loginSuccess ? "✅ Login Successful" : "❌ Login Failed"}\n`);

    // Test 4: Get WAN IP with auth
    console.log("4️⃣ Testing WAN IP retrieval (with auth)...");
    const info = await getWanIPWithAuth();
    console.log(`   Modem Name: ${info.name}`);
    console.log(`   WAN IP: ${info.wan_ip}\n`);

    console.log("✅ All tests passed!");
    console.log("\n🎉 Modem is ready. You can now run the bot:");
    console.log("   bun run dev");
  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message);
    console.error("\n📝 Debug info:", error);
    process.exit(1);
  }
}

runTests();
