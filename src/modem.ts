import axios from "axios";
import crypto from "crypto";

const MODEM_IP = process.env.MODEM_IP || "192.168.8.1";
const BASE_URL = `http://${MODEM_IP}/api`;

export interface ModemInfo {
  name: string;
  wan_ip: string;
  timestamp?: string;
}

/**
 * Helper function to sleep/delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse XML response from Huawei modem
 */
function parseXMLValue(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1] : "";
}

/**
 * Get token and session from Huawei B312
 */
export async function getToken(): Promise<{ token: string; session: string }> {
  try {
    const res = await axios.get(`${BASE_URL}/webserver/SesTokInfo`, {
      timeout: 10000,
    });

    // Parse XML response
    const xmlData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const token = parseXMLValue(xmlData, "TokInfo");
    const session = parseXMLValue(xmlData, "SesInfo");

    if (!token) {
      throw new Error("Failed to get token from modem");
    }

    return { token, session };
  } catch (error) {
    console.error("Error getting token:", error);
    throw new Error("Tidak bisa terhubung ke modem. Pastikan modem hidup dan terhubung.");
  }
}

/**
 * Get current WAN IP from Huawei B312
 */
export async function getWanIP(): Promise<ModemInfo> {
  try {
    const res = await axios.get(`${BASE_URL}/monitoring/status`, {
      timeout: 10000,
    });

    // Parse XML response
    const xmlData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    
    // Check for error (usually 125002 means need authentication)
    const errorCode = parseXMLValue(xmlData, "code");
    if (errorCode) {
      // Return with note that login is required
      return {
        wan_ip: "Login Required",
        name: "Huawei B312",
      };
    }
    
    const wanIP = parseXMLValue(xmlData, "WanIPAddress") || parseXMLValue(xmlData, "WanIpAddress") || "Not Connected";

    return {
      wan_ip: wanIP,
      name: "Huawei B312",
    };
  } catch (error) {
    console.error("Error getting WAN IP:", error);
    // Don't throw error, return info instead
    return {
      wan_ip: "Error getting IP",
      name: "Huawei B312",
    };
  }
}

/**
 * Encode password for Huawei B312 login
 * Password type 4 = base64(sha256(username + base64(sha256(password)) + token))
 */
function encodePassword(username: string, password: string, token: string): string {
  // First hash: sha256(password)
  const firstHash = crypto.createHash("sha256").update(password).digest("hex");
  const firstBase64 = Buffer.from(firstHash, "hex").toString("base64");

  // Second hash: sha256(username + firstBase64 + token)
  const secondInput = username + firstBase64 + token;
  const secondHash = crypto.createHash("sha256").update(secondInput).digest("hex");
  const finalBase64 = Buffer.from(secondHash, "hex").toString("base64");

  console.log(`🔐 Encoding password for user: ${username}`);
  console.log(`   Token: ${token.substring(0, 20)}...`);

  return finalBase64;
}

/**
 * Login to Huawei B312
 */
export async function login(username: string, password: string): Promise<boolean> {
  try {
    const { token } = await getToken();

    const encodedPassword = encodePassword(username, password, token);

    const loginXML = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <Username>${username}</Username>
  <Password>${encodedPassword}</Password>
  <password_type>4</password_type>
</request>`;

    const headers = {
      __RequestVerificationToken: token,
      "Content-Type": "application/xml",
    };

    const res = await axios.post(`${BASE_URL}/user/login`, loginXML, {
      headers,
      timeout: 10000,
    });

    const responseText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    
    console.log("Login response:", responseText.substring(0, 200));
    
    // Check if login successful
    if (responseText.includes("<response>OK</response>") || responseText.includes("OK")) {
      console.log("✅ Login successful");
      return true;
    }

    // Check for error
    const errorCode = parseXMLValue(responseText, "code");
    if (errorCode) {
      console.log(`❌ Login error code: ${errorCode}`);
    }

    return false;
  } catch (error: any) {
    console.error("Error during login:", error.message);
    return false;
  }
}

/**
 * Change IP by disconnecting and reconnecting mobile data
 */
export async function changeIP(): Promise<ModemInfo> {
  try {
    console.log("Starting IP change process...");

    // Get token
    const { token } = await getToken();

    const headers = {
      __RequestVerificationToken: token,
      "Content-Type": "application/xml",
    };

    // Disconnect
    console.log("Disconnecting mobile data...");
    const disconnectXML = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <dataswitch>0</dataswitch>
</request>`;

    const disconnectRes = await axios.post(`${BASE_URL}/dialup/mobile-dataswitch`, disconnectXML, {
      headers,
      timeout: 15000,
      validateStatus: () => true, // Accept any status
    });

    console.log("Disconnect response:", typeof disconnectRes.data === 'string' ? disconnectRes.data.substring(0, 100) : disconnectRes.status);

    // Wait for disconnect to complete
    await sleep(3000);

    // Get new token for connect request
    const { token: newToken } = await getToken();

    const newHeaders = {
      __RequestVerificationToken: newToken,
      "Content-Type": "application/xml",
    };

    // Connect
    console.log("Reconnecting mobile data...");
    const connectXML = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <dataswitch>1</dataswitch>
</request>`;

    const connectRes = await axios.post(`${BASE_URL}/dialup/mobile-dataswitch`, connectXML, {
      headers: newHeaders,
      timeout: 15000,
      validateStatus: () => true, // Accept any status
    });

    console.log("Connect response:", typeof connectRes.data === 'string' ? connectRes.data.substring(0, 100) : connectRes.status);

    // Wait for new IP to be assigned
    console.log("Waiting for new IP...");
    await sleep(5000);

    // Get new IP
    const newInfo = await getWanIPWithAuth();
    
    // Add timestamp
    newInfo.timestamp = new Date().toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    console.log("IP change completed:", newInfo.wan_ip);

    return newInfo;
  } catch (error: any) {
    console.error("Error changing IP:", error.message);
    throw new Error("Gagal mengganti IP. " + (error.message || "Coba lagi dalam beberapa saat."));
  }
}

/**
 * Check modem connection status
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await axios.get(`${BASE_URL}/monitoring/traffic-statistics`, {
      timeout: 5000,
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Auto-login with saved credentials
 */
export async function autoLogin(): Promise<boolean> {
  const username = process.env.MODEM_USERNAME || "admin";
  const password = process.env.MODEM_PASSWORD || "admin";
  
  try {
    return await login(username, password);
  } catch (error) {
    console.error("Auto-login failed:", error);
    return false;
  }
}

/**
 * Get WAN IP with auto-login if needed
 */
export async function getWanIPWithAuth(): Promise<ModemInfo> {
  let info = await getWanIP();
  
  // If login required, try auto-login (but don't fail if it doesn't work)
  if (info.wan_ip === "Login Required") {
    console.log("🔐 Login required for full status");
    console.log("📝 Note: Some features may require manual login through the web interface");
    
    // Try auto-login but don't block if it fails
    try {
      const loginSuccess = await autoLogin();
      if (loginSuccess) {
        console.log("✅ Auto-login successful");
        await sleep(1000);
        info = await getWanIP();
      }
    } catch (error) {
      // Silently fail - user can still use reconnect features
      console.log("💡 Tip: Login via web interface (192.168.8.1) or use Konfigurasi menu");
    }
  }
  
  return info;
}
