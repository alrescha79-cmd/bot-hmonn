import axios from "axios";
import crypto from "crypto";
import { getModemConfig } from "./storage";

// Modem configuration
let modemIP = process.env.MODEM_IP || "192.168.8.1";
let modemUsername = process.env.MODEM_USERNAME || "admin";
let modemPassword = process.env.MODEM_PASSWORD || "admin";

// Store session and token after login for authenticated requests
let currentSession: string | null = null;
let currentToken: string | null = null;

export function setModemIP(ip: string) {
  modemIP = ip;
  currentSession = null;
}

export function getModemIP(): string {
  return modemIP;
}

export function setModemCredentials(username: string, password: string) {
  modemUsername = username;
  modemPassword = password;
  currentSession = null;
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
 * Format timestamp to DD-MM-YYYY, HH:MM:SS format
 */
export function formatTimestamp(date: Date = new Date()): string {
  const pad = (n: number): string => n.toString().padStart(2, '0');

  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${day}-${month}-${year}, ${hours}:${minutes}:${seconds}`;
}

/**
 * Normalize any timestamp to DD-MM-YYYY, HH:MM:SS format
 * Handles various formats like:
 * - "14/12/2025, 09.08.40" (old Indonesian locale format)
 * - "12/14/2025, 09:08:40" (US format)
 * - Already correct format "14-12-2025, 09:08:40"
 */
export function normalizeTimestamp(timestamp: string): string {
  // Check if already in correct format DD-MM-YYYY, HH:MM:SS
  if (/^\d{2}-\d{2}-\d{4}, \d{2}:\d{2}:\d{2}$/.test(timestamp)) {
    return timestamp;
  }

  // Try to parse the timestamp
  try {
    // Handle Indonesian locale format: "14/12/2025, 09.08.40" (DD/MM/YYYY, HH.MM.SS)
    const indonesianMatch = timestamp.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2})\.(\d{1,2})\.(\d{1,2})$/);
    if (indonesianMatch) {
      const [, day, month, year, hours, minutes, seconds] = indonesianMatch;
      const pad = (s: string) => s.padStart(2, '0');
      return `${pad(day)}-${pad(month)}-${year}, ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    // Handle US format: "12/14/2025, 09:08:40" (MM/DD/YYYY, HH:MM:SS)
    const usMatch = timestamp.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
    if (usMatch) {
      const [, month, day, year, hours, minutes, seconds] = usMatch;
      const pad = (s: string) => s.padStart(2, '0');
      return `${pad(day)}-${pad(month)}-${year}, ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    // Fallback: try parsing with Date
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return formatTimestamp(date);
    }
  } catch {
    // If parsing fails, return original
  }

  return timestamp;
}

/**
 * Get fresh token and session for API calls
 * This should be used before each POST request
 */
export async function getTokenAndSession(): Promise<{ token: string; session: string }> {
  // Get fresh token
  const { token, session } = await getToken();

  // Login if needed and use the response token
  if (!currentSession) {
    await autoLogin();
  }

  // Return the token from login if available, otherwise use the fresh token
  return {
    token: currentToken || token,
    session: currentSession || session,
  };
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
 * Get token and session from Huawei modem
 */
export async function getToken(): Promise<{ token: string; session: string }> {
  try {
    const res = await axios.get(`${getBaseURL()}/webserver/SesTokInfo`, {
      timeout: 10000,
    });

    const xmlData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const token = parseXMLValue(xmlData, "TokInfo");
    const sesInfo = parseXMLValue(xmlData, "SesInfo");

    if (!token) {
      throw new Error("Failed to get token from modem");
    }

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

    if (!session && sesInfo) {
      if (sesInfo.includes('SessionID=')) {
        session = sesInfo;
      } else {
        session = `SessionID=${sesInfo}`;
      }
    }

    return { token, session };
  } catch (error: any) {
    throw new Error("Failed to get token: " + error.message);
  }
}

/**
 * Encode password using SHA256 (for password_type 4)
 */
function encodePassword(password: string, token: string): string {
  // SHA256 hash of password
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  // Concatenate: username + base64(passwordHash) + token
  const base64PasswordHash = Buffer.from(passwordHash).toString('base64');
  const combined = modemUsername + base64PasswordHash + token;

  // SHA256 hash of combined
  const finalHash = crypto.createHash('sha256').update(combined).digest('hex');

  // Base64 encode
  return Buffer.from(finalHash).toString('base64');
}

/**
 * Login to modem
 */
export async function login(username?: string, password?: string): Promise<boolean> {
  try {
    if (username) modemUsername = username;
    if (password) modemPassword = password;

    const { token, session } = await getToken();

    // Check login state
    const stateRes = await axios.get(`${getBaseURL()}/user/state-login`, {
      headers: { Cookie: session },
      timeout: 10000,
    });

    const passwordType = parseXMLValue(stateRes.data, "password_type") || "4";

    // Encode password
    const encodedPassword = encodePassword(modemPassword, token);

    // Login
    const loginXML = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <Username>${modemUsername}</Username>
  <Password>${encodedPassword}</Password>
  <password_type>${passwordType}</password_type>
</request>`;

    const loginRes = await axios.post(`${getBaseURL()}/user/login`, loginXML, {
      headers: {
        __RequestVerificationToken: token,
        "Content-Type": "application/xml",
        Cookie: session,
      },
      timeout: 10000,
      validateStatus: () => true,
    });

    if (loginRes.data.includes("<response>OK</response>")) {
      // Save session from response cookie
      const setCookie = loginRes.headers['set-cookie'];
      if (setCookie && setCookie.length > 0) {
        const sessionCookie = setCookie.find((c: string) => c.includes('SessionID'));
        if (sessionCookie) {
          const match = sessionCookie.match(/SessionID=([^;]+)/);
          if (match) {
            currentSession = `SessionID=${match[1]}`;
          }
        }
      }

      if (!currentSession) {
        currentSession = session;
      }

      // Save token from response headers - this token matches our session!
      const respToken = loginRes.headers['__requestverificationtoken'];
      if (respToken) {
        currentToken = respToken;
        console.log("✅ Login successful, got new token from response");
      } else {
        // Use the original token if no new one in response
        currentToken = token;
        console.log("✅ Login successful");
      }

      return true;
    }

    const errorCode = parseXMLValue(loginRes.data, "code");
    console.log(`❌ Login failed: ${errorCode}`);
    return false;
  } catch (error: any) {
    console.error("Login error:", error.message);
    return false;
  }
}

/**
 * Auto-login with saved credentials
 */
export async function autoLogin(): Promise<boolean> {
  const savedConfig = await getModemConfig();
  if (savedConfig) {
    if (savedConfig.ip) modemIP = savedConfig.ip;
    if (savedConfig.username) modemUsername = savedConfig.username;
    if (savedConfig.password) modemPassword = savedConfig.password;
    console.log(`📂 Using saved credentials for user: ${modemUsername}`);
  }
  return login();
}

/**
 * Get WAN IP and device info
 */
export async function getWanIP(): Promise<ModemInfo> {
  try {
    // Try without auth first
    const res = await axios.get(`${getBaseURL()}/device/information`, {
      timeout: 10000,
      validateStatus: () => true,
    });

    if (res.data.includes("<error>")) {
      return {
        name: "Huawei Modem",
        wan_ip: "Login Required",
      };
    }

    return {
      name: parseXMLValue(res.data, "DeviceName") || "Huawei Modem",
      wan_ip: parseXMLValue(res.data, "WanIPAddress") || "Unknown",
    };
  } catch (error: any) {
    return {
      name: "Huawei Modem",
      wan_ip: "Error: " + error.message,
    };
  }
}

/**
 * Get WAN IP with authentication
 */
export async function getWanIPWithAuth(): Promise<ModemInfo> {
  try {
    // Ensure we're logged in
    if (!currentSession) {
      await autoLogin();
    }

    const { token } = await getToken();

    const res = await axios.get(`${getBaseURL()}/device/information`, {
      headers: {
        Cookie: currentSession || "",
        __RequestVerificationToken: token,
      },
      timeout: 10000,
      validateStatus: () => true,
    });

    if (res.data.includes("<error>")) {
      // Try re-login
      currentSession = null;
      await autoLogin();
      return getWanIPWithAuth();
    }

    console.log("✅ Got WAN IP from /device/information");
    return {
      name: parseXMLValue(res.data, "DeviceName") || "Huawei Modem",
      wan_ip: parseXMLValue(res.data, "WanIPAddress") || "Unknown",
    };
  } catch (error: any) {
    return {
      name: "Huawei Modem",
      wan_ip: "Error: " + error.message,
    };
  }
}

/**
 * Check modem connection
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await axios.get(`${getBaseURL()}/monitoring/traffic-statistics`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get network info (provider)
 */
export async function getNetworkInfo(): Promise<{ provider: string }> {
  try {
    if (!currentSession) await autoLogin();
    const { token } = await getToken();

    const res = await axios.get(`${getBaseURL()}/net/current-plmn`, {
      headers: {
        Cookie: currentSession || "",
        __RequestVerificationToken: token,
      },
      timeout: 10000,
    });

    return {
      provider: parseXMLValue(res.data, "FullName") ||
        parseXMLValue(res.data, "ShortName") ||
        "Unknown",
    };
  } catch {
    return { provider: "Unknown" };
  }
}

/**
 * Get traffic statistics
 */
export async function getTrafficStats(): Promise<{
  currentDownload: number;
  currentUpload: number;
  totalDownload: number;
  totalUpload: number;
  dataUsage: string;
}> {
  try {
    if (!currentSession) await autoLogin();
    const { token } = await getToken();

    const res = await axios.get(`${getBaseURL()}/monitoring/traffic-statistics`, {
      headers: {
        Cookie: currentSession || "",
        __RequestVerificationToken: token,
      },
      timeout: 10000,
    });

    const totalDownload = parseInt(parseXMLValue(res.data, "TotalDownload")) || 0;
    const totalUpload = parseInt(parseXMLValue(res.data, "TotalUpload")) || 0;
    const currentDownload = parseInt(parseXMLValue(res.data, "CurrentDownloadRate")) || 0;
    const currentUpload = parseInt(parseXMLValue(res.data, "CurrentUploadRate")) || 0;

    return {
      currentDownload,
      currentUpload,
      totalDownload,
      totalUpload,
      dataUsage: `⬇️ ${formatBytes(totalDownload)} / ⬆️ ${formatBytes(totalUpload)}`,
    };
  } catch {
    return {
      currentDownload: 0,
      currentUpload: 0,
      totalDownload: 0,
      totalUpload: 0,
      dataUsage: "N/A",
    };
  }
}

/**
 * Get signal info
 */
export async function getSignalInfo(): Promise<{
  rssi: string;
  rsrp: string;
  rsrq: string;
  sinr: string;
  signalStrength: string;
}> {
  try {
    if (!currentSession) await autoLogin();
    const { token } = await getToken();

    const res = await axios.get(`${getBaseURL()}/device/signal`, {
      headers: {
        Cookie: currentSession || "",
        __RequestVerificationToken: token,
      },
      timeout: 10000,
    });

    const rssi = parseXMLValue(res.data, "rssi") || "N/A";
    const rsrp = parseXMLValue(res.data, "rsrp") || "N/A";
    const rsrq = parseXMLValue(res.data, "rsrq") || "N/A";
    const sinr = parseXMLValue(res.data, "sinr") || "N/A";

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
  } catch {
    return { rssi: "N/A", rsrp: "N/A", rsrq: "N/A", sinr: "N/A", signalStrength: "N/A" };
  }
}

/**
 * Get monthly statistics
 */
export async function getMonthStats(): Promise<{
  currentMonthDownload: number;
  currentMonthUpload: number;
  monthUsage: string;
}> {
  try {
    if (!currentSession) await autoLogin();
    const { token } = await getToken();

    const res = await axios.get(`${getBaseURL()}/monitoring/month_statistics`, {
      headers: {
        Cookie: currentSession || "",
        __RequestVerificationToken: token,
      },
      timeout: 10000,
    });

    const currentMonthDownload = parseInt(parseXMLValue(res.data, "CurrentMonthDownload")) || 0;
    const currentMonthUpload = parseInt(parseXMLValue(res.data, "CurrentMonthUpload")) || 0;

    return {
      currentMonthDownload,
      currentMonthUpload,
      monthUsage: formatBytes(currentMonthDownload + currentMonthUpload),
    };
  } catch {
    return { currentMonthDownload: 0, currentMonthUpload: 0, monthUsage: "N/A" };
  }
}

/**
 * Get full modem info
 */
export async function getFullModemInfo(): Promise<ModemInfo> {
  try {
    if (!currentSession) await autoLogin();

    const [wanInfo, networkInfo, trafficStats] = await Promise.all([
      getWanIPWithAuth(),
      getNetworkInfo(),
      getTrafficStats(),
    ]);

    return {
      ...wanInfo,
      provider: networkInfo.provider,
      dataUsage: trafficStats.dataUsage,
      totalDownload: trafficStats.totalDownload,
      totalUpload: trafficStats.totalUpload,
    };
  } catch (error: any) {
    return {
      name: "Huawei Modem",
      wan_ip: "Error: " + error.message,
    };
  }
}

/**
 * Get detailed modem info
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
  try {
    if (!currentSession) await autoLogin();

    const [wanInfo, networkInfo, signalInfo, trafficStats, monthStats] = await Promise.all([
      getWanIPWithAuth(),
      getNetworkInfo(),
      getSignalInfo(),
      getTrafficStats(),
      getMonthStats(),
    ]);

    return {
      deviceName: wanInfo.name,
      wanIP: wanInfo.wan_ip,
      provider: networkInfo.provider,
      signalStrength: signalInfo.signalStrength,
      rssi: signalInfo.rssi,
      totalDownload: formatBytes(trafficStats.totalDownload),
      totalUpload: formatBytes(trafficStats.totalUpload),
      monthUsage: monthStats.monthUsage,
    };
  } catch {
    return {
      deviceName: "Huawei Modem",
      wanIP: "Error",
      provider: "Unknown",
      signalStrength: "N/A",
      rssi: "N/A",
      totalDownload: "N/A",
      totalUpload: "N/A",
      monthUsage: "N/A",
    };
  }
}

/**
 * Change IP by triggering PLMN network scan
 * Calling /api/net/plmn-list causes the modem to disconnect and reconnect to network
 * This is the same method used in Python huawei-lte-api library
 */
export async function changeIP(): Promise<ModemInfo> {
  try {
    console.log("Starting IP change process via PLMN scan...");

    // Get old IP first
    const oldInfo = await getWanIPWithAuth();
    const oldIP = oldInfo.wan_ip;
    console.log("Old IP:", oldIP);

    // Trigger PLMN scan - this causes network reconnection
    console.log("Triggering PLMN network scan...");
    const scanResult = await triggerPLMNScan();

    if (!scanResult.success) {
      console.log("⚠️ PLMN scan may have issues, but continuing...");
    } else {
      console.log("✅ PLMN scan completed");
    }

    // Wait for network reconnection
    console.log("Waiting for network reconnection (15 seconds)...");
    await sleep(15000);

    // Force re-login and get new IP
    currentSession = null;
    currentToken = null;
    await autoLogin();

    const newInfo = await getWanIPWithAuth();
    newInfo.timestamp = formatTimestamp();

    console.log("IP change completed:");
    console.log("  Old IP:", oldIP);
    console.log("  New IP:", newInfo.wan_ip);

    if (oldIP === newInfo.wan_ip) {
      console.log("⚠️ IP did not change. ISP may have assigned the same IP.");
    } else {
      console.log("✅ IP changed successfully!");
    }

    return newInfo;
  } catch (error: any) {
    console.error("Error changing IP:", error.message);
    throw new Error("Gagal mengganti IP: " + error.message);
  }
}

/**
 * Trigger PLMN network scan using /api/net/plmn-list
 * This is a GET request that causes the modem to scan for available networks
 * which disconnects and reconnects the current network, often resulting in new IP
 */
export async function triggerPLMNScan(): Promise<{ success: boolean; networks?: string[] }> {
  try {
    console.log("Requesting PLMN list (network scan)...");

    // Ensure we're logged in
    if (!currentSession) {
      await autoLogin();
    }

    // Get fresh token for the request
    const { token } = await getToken();

    // GET request to /api/net/plmn-list - this triggers network scan
    const res = await axios.get(`${getBaseURL()}/net/plmn-list`, {
      headers: {
        Cookie: currentSession || "",
        __RequestVerificationToken: token,
      },
      timeout: 120000, // 2 minutes timeout - scan can take a while
      validateStatus: () => true,
    });

    const responseData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    console.log("PLMN scan response:", responseData.substring(0, 300));

    // Check for errors
    if (responseData.includes("<error>")) {
      const errorCode = parseXMLValue(responseData, "code");
      console.log(`PLMN scan error code: ${errorCode}`);
      // Even with error, the scan might have triggered reconnection
      return { success: false };
    }

    // Parse networks if available
    const networks: string[] = [];
    const fullNameMatches = responseData.matchAll(/<FullName>([^<]+)<\/FullName>/g);
    for (const match of fullNameMatches) {
      networks.push(match[1]);
    }

    console.log(`Found ${networks.length} networks:`, networks.join(", "));
    return { success: true, networks };
  } catch (error: any) {
    console.error("PLMN scan error:", error.message);
    // Even if request fails, modem might have started the scan process
    return { success: false };
  }
}

/**
 * Reboot modem using /api/device/control endpoint
 */
export async function rebootModem(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("Preparing to reboot modem...");

    // Fresh login
    currentSession = null;
    currentToken = null;
    const loginSuccess = await autoLogin();

    if (!loginSuccess || !currentSession) {
      return { success: false, error: "Login failed" };
    }

    // Get fresh token for POST request
    const { token: freshToken } = await getToken();

    console.log("Sending reboot command...");
    console.log("Token:", freshToken.substring(0, 20) + "...");

    // Use /api/device/control with Control=1 for reboot
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <Control>1</Control>
</request>`;

    const res = await axios.post(`${getBaseURL()}/device/control`, xml, {
      headers: {
        __RequestVerificationToken: freshToken,
        "Content-Type": "application/xml",
        Cookie: currentSession,
      },
      timeout: 15000,
      validateStatus: () => true,
    });

    const responseData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    console.log("Reboot response:", responseData.substring(0, 200));

    if (responseData.includes("<response>OK</response>")) {
      return { success: true };
    }

    // Check for error code
    const errorCode = parseXMLValue(responseData, "code");
    if (errorCode) {
      console.log(`Reboot error code: ${errorCode}`);
      return { success: false, error: `Error code: ${errorCode}` };
    }

    return { success: false, error: "Unknown error" };
  } catch (error: any) {
    console.error("Reboot error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Set mobile data on/off using mobile-dataswitch endpoint
 * This is more reliable than dialup/dial
 * IMPORTANT: Huawei tokens are single-use, so we need fresh token for each POST
 */
export async function setMobileData(enabled: boolean): Promise<{ success: boolean; response?: string }> {
  try {
    // Fresh login for each operation
    currentSession = null;
    currentToken = null;
    await autoLogin();

    if (!currentSession) {
      throw new Error("No valid session after login");
    }

    // Store session for TypeScript type narrowing
    const sessionCookie: string = currentSession;

    // CRITICAL: Get a fresh token AFTER login for the POST request
    // The login token is consumed by the login itself
    // Huawei uses single-use tokens!
    const { token: freshToken } = await getToken();

    const action = enabled ? 1 : 0;
    const actionName = enabled ? "ON" : "OFF";

    console.log(`Setting mobile data ${actionName}...`);
    console.log("Fresh Token:", freshToken.substring(0, 20) + "...");
    console.log("Session:", sessionCookie.substring(0, 30) + "...");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <dataswitch>${action}</dataswitch>
</request>`;

    const res = await axios.post(`${getBaseURL()}/dialup/mobile-dataswitch`, xml, {
      headers: {
        __RequestVerificationToken: freshToken,
        "Content-Type": "application/xml",
        Cookie: sessionCookie,
      },
      timeout: 15000,
      validateStatus: () => true,
    });

    const responseData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    console.log(`Mobile data ${actionName} response:`, responseData.substring(0, 150));

    // Update token from response if available
    const respToken = res.headers['__requestverificationtoken'];
    if (respToken) {
      currentToken = String(respToken);
    }

    if (responseData.includes("<response>OK</response>")) {
      return { success: true, response: responseData };
    }

    // Check for specific error codes
    const errorCode = parseXMLValue(responseData, "code");
    if (errorCode) {
      console.log(`Error code: ${errorCode}`);
    }

    return { success: false, response: responseData };
  } catch (error: any) {
    console.error(`Error setting mobile data:`, error.message);
    return { success: false };
  }
}

