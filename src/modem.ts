import axios from "axios";
import crypto from "crypto";
import { getModemConfig } from "./storage";

let modemIP = process.env.MODEM_IP || "192.168.8.1";
let modemUsername = process.env.MODEM_USERNAME || "admin";
let modemPassword = process.env.MODEM_PASSWORD || "admin";

// Store session after login for authenticated requests
let currentSession: string | null = null;

export function setModemIP(ip: string) {
  modemIP = ip;
  // Clear session when IP changes
  currentSession = null;
}

export function getModemIP(): string {
  return modemIP;
}

export function setModemCredentials(username: string, password: string) {
  modemUsername = username;
  modemPassword = password;
}

export function getModemCredentials(): { username: string; password: string } {
  return { username: modemUsername, password: modemPassword };
}

function getBaseURL(): string {
  return `http://${modemIP}/api`;
}

export interface ModemInfo {
  name: string;
  wan_ip: string;
  timestamp?: string;
  provider?: string;
  dataUsage?: string;
  totalDownload?: number;
  totalUpload?: number;
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
    const res = await axios.get(`${getBaseURL()}/webserver/SesTokInfo`, {
      timeout: 10000,
    });

    // Parse XML response
    const xmlData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const token = parseXMLValue(xmlData, "TokInfo");
    const sesInfo = parseXMLValue(xmlData, "SesInfo");

    if (!token) {
      throw new Error("Failed to get token from modem");
    }

    // Try to get session from Set-Cookie header first
    let session = "";
    const setCookie = res.headers['set-cookie'];
    if (setCookie && setCookie.length > 0) {
      const sessionCookie = setCookie.find((c: string) => c.includes('SessionID'));
      if (sessionCookie) {
        const match = sessionCookie.match(/SessionID=([^;]+)/);
        if (match) {
          session = `SessionID=${match[1]}`;
        }
      }
    }

    // Fallback to SesInfo from XML (format might already be SessionID=xxx)
    if (!session && sesInfo) {
      // SesInfo might be the full cookie value or just the session ID
      if (sesInfo.includes('SessionID=')) {
        session = sesInfo;
      } else {
        session = `SessionID=${sesInfo}`;
      }
    }

    console.log(`🔑 Got token: ${token.substring(0, 20)}..., session: ${session.substring(0, 30)}...`);

    return { token, session };
  } catch (error) {
    console.error("Error getting token:", error);
    throw new Error("Tidak bisa terhubung ke modem. Pastikan modem hidup dan terhubung.");
  }
}

/**
 * Get current WAN IP from Huawei B312
 * Use /device/information endpoint which returns WanIPAddress and DeviceName
 */
export async function getWanIP(): Promise<ModemInfo> {
  // Build headers with session cookie if available
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (currentSession) {
    headers.Cookie = currentSession;
  }

  // Try /device/information first (this is the endpoint that works)
  try {
    const res = await axios.get(`${getBaseURL()}/device/information`, {
      timeout: 10000,
      headers,
    });

    const xmlData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

    // Check for error
    const errorCode = parseXMLValue(xmlData, "code");
    if (errorCode) {
      console.log(`📡 /device/information error: ${errorCode}`);
      // Clear session for auth errors
      if (errorCode === "125002" || errorCode === "125003") {
        currentSession = null;
      }
    } else {
      // Success! Get WAN IP and Device Name
      const wanIP = parseXMLValue(xmlData, "WanIPAddress");
      const deviceName = parseXMLValue(xmlData, "DeviceName") || "Huawei B312";

      if (wanIP) {
        console.log(`✅ Got WAN IP: ${wanIP} from /device/information`);
        return {
          wan_ip: wanIP,
          name: deviceName,
        };
      }
    }
  } catch (error: any) {
    console.error("Error from /device/information:", error.message);
  }

  // Fallback: Try /monitoring/status
  try {
    const res = await axios.get(`${getBaseURL()}/monitoring/status`, {
      timeout: 10000,
      headers,
    });

    const xmlData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const errorCode = parseXMLValue(xmlData, "code");

    if (!errorCode) {
      const wanIP = parseXMLValue(xmlData, "WanIPAddress") || parseXMLValue(xmlData, "WanIpAddress");
      if (wanIP) {
        return {
          wan_ip: wanIP,
          name: "Huawei B312",
        };
      }
    }
  } catch (error) {
    // Ignore
  }

  // All attempts failed - login might be required
  return {
    wan_ip: "Login Required",
    name: "Huawei B312",
  };
}

/**
 * Encode password for Huawei B312 login
 * Password type 4 = base64(sha256(username + base64(sha256(password).hexdigest) + token).hexdigest)
 * 
 * Based on huawei-lte-api Python library:
 * - First: base64.b64encode(sha256(password).hexdigest().encode('ascii'))
 * - Then: base64.b64encode(sha256(username + first + token).hexdigest().encode('ascii'))
 */
function encodePassword(username: string, password: string, token: string): string {
  // First hash: sha256(password) -> hex string -> encode as ascii -> base64
  const firstHash = crypto.createHash("sha256").update(password, "utf8").digest("hex");
  // Base64 encode the hex string directly (as ASCII bytes), NOT the binary hash
  const firstBase64 = Buffer.from(firstHash, "ascii").toString("base64");

  // Second hash: sha256(username + firstBase64 + token) -> hex string -> base64
  const secondInput = username + firstBase64 + token;
  const secondHash = crypto.createHash("sha256").update(secondInput, "utf8").digest("hex");
  // Again, base64 encode the hex string directly (as ASCII bytes)
  const finalBase64 = Buffer.from(secondHash, "ascii").toString("base64");

  console.log(`🔐 Encoding password for user: ${username}`);
  console.log(`   Token: ${token.substring(0, 20)}...`);

  return finalBase64;
}

/**
 * Get login state and password type from modem
 */
async function getLoginState(): Promise<{ state: number; passwordType: number }> {
  try {
    const { token, session } = await getToken();
    const res = await axios.get(`${getBaseURL()}/user/state-login`, {
      timeout: 10000,
      headers: { Cookie: session },
    });

    const xmlData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const state = parseInt(parseXMLValue(xmlData, "State")) || 0;
    const passwordType = parseInt(parseXMLValue(xmlData, "password_type")) || 4;

    return { state, passwordType };
  } catch (error) {
    // Default to password type 4 (SHA256)
    return { state: -1, passwordType: 4 };
  }
}

/**
 * Login to Huawei B312
 */
export async function login(username: string, password: string): Promise<boolean> {
  try {
    // Check login state first
    const loginState = await getLoginState();
    console.log(`📡 Login state: ${loginState.state}, Password type: ${loginState.passwordType}`);

    // If already logged in, return success
    if (loginState.state === 0) {
      console.log("✅ Already logged in");
      return true;
    }

    // Get fresh token and session for login
    const { token, session } = await getToken();

    const encodedPassword = encodePassword(username, password, token);

    const loginXML = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <Username>${username}</Username>
  <Password>${encodedPassword}</Password>
  <password_type>${loginState.passwordType}</password_type>
</request>`;

    // Include session cookie to fix error 125003
    const headers = {
      __RequestVerificationToken: token,
      "Content-Type": "application/xml",
      Cookie: session,
    };

    const res = await axios.post(`${getBaseURL()}/user/login`, loginXML, {
      headers,
      timeout: 10000,
    });

    const responseText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

    console.log("Login response:", responseText.substring(0, 200));

    // Check if login successful
    if (responseText.includes("<response>OK</response>") || responseText.includes("OK")) {
      // Try to get new session from Set-Cookie header
      const setCookie = res.headers['set-cookie'];
      if (setCookie && setCookie.length > 0) {
        // Extract SessionID from Set-Cookie
        const sessionCookie = setCookie.find((c: string) => c.includes('SessionID'));
        if (sessionCookie) {
          // Parse the cookie value (format: SessionID=xxx; path=/; HttpOnly)
          const match = sessionCookie.match(/SessionID=([^;]+)/);
          if (match) {
            currentSession = `SessionID=${match[1]}`;
            console.log("✅ Login successful, new session from Set-Cookie saved");
            return true;
          }
        }
      }

      // Fallback: use the session we sent (might work for some modems)
      currentSession = session;
      console.log("✅ Login successful, session saved (fallback)");
      return true;
    }

    // Check for error
    const errorCode = parseXMLValue(responseText, "code");
    const waitTime = parseXMLValue(responseText, "waittime");

    if (errorCode) {
      const errorMessages: Record<string, string> = {
        "108001": "Username salah",
        "108002": "Password salah",
        "108003": "Sudah login di tempat lain",
        "108006": "Username atau password salah",
        "108007": `Terlalu banyak percobaan gagal. Tunggu ${waitTime || "beberapa"} menit`,
        "125003": "Session token tidak valid",
      };
      const message = errorMessages[errorCode] || `Error code: ${errorCode}`;
      console.log(`❌ Login error: ${message}`);
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

    const disconnectRes = await axios.post(`${getBaseURL()}/dialup/mobile-dataswitch`, disconnectXML, {
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

    const connectRes = await axios.post(`${getBaseURL()}/dialup/mobile-dataswitch`, connectXML, {
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
    await axios.get(`${getBaseURL()}/monitoring/traffic-statistics`, {
      timeout: 5000,
    });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Auto-login with saved credentials
 * Priority: 1. Saved config (from Setup Modem) 2. Environment variables 3. Defaults
 */
export async function autoLogin(): Promise<boolean> {
  // Try to get saved config from storage first
  const savedConfig = await getModemConfig();

  let username: string;
  let password: string;

  if (savedConfig?.username && savedConfig?.password) {
    // Use saved config from Setup Modem
    username = savedConfig.username;
    password = savedConfig.password;
    console.log(`📂 Using saved credentials for user: ${username}`);
  } else {
    // Fall back to environment variables
    username = modemUsername;
    password = modemPassword;
    console.log(`🔧 Using env credentials for user: ${username}`);
  }

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

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Get network/provider info from Huawei B312
 */
export async function getNetworkInfo(): Promise<{ provider: string; networkType?: string }> {
  try {
    const headers: Record<string, string> = {};
    if (currentSession) {
      headers.Cookie = currentSession;
    }

    const res = await axios.get(`${getBaseURL()}/net/current-plmn`, {
      timeout: 10000,
      headers,
    });

    const xmlData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

    // Check for error
    const errorCode = parseXMLValue(xmlData, "code");
    if (errorCode) {
      return { provider: "Unknown" };
    }

    const fullName = parseXMLValue(xmlData, "FullName") || parseXMLValue(xmlData, "ShortName") || "Unknown";
    const networkType = parseXMLValue(xmlData, "Rat");

    return {
      provider: fullName,
      networkType: networkType === "4" ? "4G LTE" : networkType === "3" ? "3G" : networkType === "2" ? "2G" : undefined
    };
  } catch (error) {
    console.error("Error getting network info:", error);
    return { provider: "Unknown" };
  }
}

/**
 * Get traffic statistics from Huawei B312
 */
export async function getTrafficStats(): Promise<{
  currentDownload: number;
  currentUpload: number;
  totalDownload: number;
  totalUpload: number;
  dataUsage: string;
}> {
  try {
    const headers: Record<string, string> = {};
    if (currentSession) {
      headers.Cookie = currentSession;
    }

    const res = await axios.get(`${getBaseURL()}/monitoring/traffic-statistics`, {
      timeout: 10000,
      headers,
    });

    const xmlData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

    // Check for error
    const errorCode = parseXMLValue(xmlData, "code");
    if (errorCode) {
      return {
        currentDownload: 0,
        currentUpload: 0,
        totalDownload: 0,
        totalUpload: 0,
        dataUsage: "N/A"
      };
    }

    const currentDownload = parseInt(parseXMLValue(xmlData, "CurrentDownload")) || 0;
    const currentUpload = parseInt(parseXMLValue(xmlData, "CurrentUpload")) || 0;
    const totalDownload = parseInt(parseXMLValue(xmlData, "TotalDownload")) || 0;
    const totalUpload = parseInt(parseXMLValue(xmlData, "TotalUpload")) || 0;

    const totalUsage = totalDownload + totalUpload;
    const dataUsage = `⬇️ ${formatBytes(totalDownload)} / ⬆️ ${formatBytes(totalUpload)}`;

    return {
      currentDownload,
      currentUpload,
      totalDownload,
      totalUpload,
      dataUsage
    };
  } catch (error) {
    console.error("Error getting traffic stats:", error);
    return {
      currentDownload: 0,
      currentUpload: 0,
      totalDownload: 0,
      totalUpload: 0,
      dataUsage: "N/A"
    };
  }
}

/**
 * Get full modem info including provider and data usage
 */
export async function getFullModemInfo(): Promise<ModemInfo> {
  const [wanInfo, networkInfo, trafficStats] = await Promise.all([
    getWanIPWithAuth(),
    getNetworkInfo(),
    getTrafficStats()
  ]);

  return {
    ...wanInfo,
    provider: networkInfo.provider,
    dataUsage: trafficStats.dataUsage,
    totalDownload: trafficStats.totalDownload,
    totalUpload: trafficStats.totalUpload
  };
}

/**
 * Get signal info from Huawei B312
 */
export async function getSignalInfo(): Promise<{
  rssi: string;
  rsrp: string;
  rsrq: string;
  sinr: string;
  signalStrength: string;
}> {
  try {
    const headers: Record<string, string> = { 'X-Requested-With': 'XMLHttpRequest' };
    if (currentSession) {
      headers.Cookie = currentSession;
    }

    const res = await axios.get(`${getBaseURL()}/device/signal`, {
      timeout: 10000,
      headers,
    });

    const xmlData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const errorCode = parseXMLValue(xmlData, "code");

    if (errorCode) {
      return { rssi: "N/A", rsrp: "N/A", rsrq: "N/A", sinr: "N/A", signalStrength: "N/A" };
    }

    const rssi = parseXMLValue(xmlData, "rssi") || "N/A";
    const rsrp = parseXMLValue(xmlData, "rsrp") || "N/A";
    const rsrq = parseXMLValue(xmlData, "rsrq") || "N/A";
    const sinr = parseXMLValue(xmlData, "sinr") || "N/A";

    // Calculate signal strength (simplified)
    let signalStrength = "N/A";
    const rssiNum = parseInt(rssi.replace("dBm", "").trim());
    if (!isNaN(rssiNum)) {
      if (rssiNum >= -65) signalStrength = "📶 Sangat Bagus";
      else if (rssiNum >= -75) signalStrength = "📶 Bagus";
      else if (rssiNum >= -85) signalStrength = "📶 Cukup";
      else if (rssiNum >= -95) signalStrength = "📶 Lemah";
      else signalStrength = "📶 Sangat Lemah";
    }

    return { rssi, rsrp, rsrq, sinr, signalStrength };
  } catch (error) {
    console.error("Error getting signal info:", error);
    return { rssi: "N/A", rsrp: "N/A", rsrq: "N/A", sinr: "N/A", signalStrength: "N/A" };
  }
}

/**
 * Get monthly statistics from Huawei B312
 */
export async function getMonthStats(): Promise<{
  currentMonthDownload: number;
  currentMonthUpload: number;
  monthUsage: string;
}> {
  try {
    const headers: Record<string, string> = { 'X-Requested-With': 'XMLHttpRequest' };
    if (currentSession) {
      headers.Cookie = currentSession;
    }

    const res = await axios.get(`${getBaseURL()}/monitoring/month_statistics`, {
      timeout: 10000,
      headers,
    });

    const xmlData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const errorCode = parseXMLValue(xmlData, "code");

    if (errorCode) {
      return { currentMonthDownload: 0, currentMonthUpload: 0, monthUsage: "N/A" };
    }

    const currentMonthDownload = parseInt(parseXMLValue(xmlData, "CurrentMonthDownload")) || 0;
    const currentMonthUpload = parseInt(parseXMLValue(xmlData, "CurrentMonthUpload")) || 0;
    const totalMonth = currentMonthDownload + currentMonthUpload;
    const monthUsage = formatBytes(totalMonth);

    return { currentMonthDownload, currentMonthUpload, monthUsage };
  } catch (error) {
    console.error("Error getting month stats:", error);
    return { currentMonthDownload: 0, currentMonthUpload: 0, monthUsage: "N/A" };
  }
}

/**
 * Get detailed modem info for the detail view
 */
export async function getDetailedModemInfo(): Promise<{
  deviceName: string;
  wanIP: string;
  provider: string;
  signalStrength: string;
  rssi: string;
  totalDownload: string;
  totalUpload: string;
  monthUsage: string;
}> {
  const [wanInfo, networkInfo, signalInfo, trafficStats, monthStats] = await Promise.all([
    getWanIPWithAuth(),
    getNetworkInfo(),
    getSignalInfo(),
    getTrafficStats(),
    getMonthStats()
  ]);

  return {
    deviceName: wanInfo.name,
    wanIP: wanInfo.wan_ip,
    provider: networkInfo.provider,
    signalStrength: signalInfo.signalStrength,
    rssi: signalInfo.rssi,
    totalDownload: formatBytes(trafficStats.totalDownload),
    totalUpload: formatBytes(trafficStats.totalUpload),
    monthUsage: monthStats.monthUsage
  };
}
