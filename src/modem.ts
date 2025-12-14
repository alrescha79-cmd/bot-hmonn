import axios from "axios";
import crypto from "crypto";

/**
 * Modem configuration interface for per-user config
 */
export interface ModemConfig {
  ip: string;
  username: string;
  password: string;
}

/**
 * Modem session data for per-user sessions
 */
export interface ModemSession {
  session: string | null;
  token: string | null;
}

/**
 * Modem info return type
 */
export interface ModemInfo {
  name: string;
  wan_ip: string;
  timestamp?: string;
  provider?: string;
  dataUsage?: string;
  totalDownload?: number;
  totalUpload?: number;
}

// Per-user session storage (keyed by Telegram user ID)
const userSessions = new Map<number, ModemSession>();

// Default config from environment (used as fallback)
const defaultConfig: ModemConfig = {
  ip: process.env.MODEM_IP || "192.168.8.1",
  username: process.env.MODEM_USERNAME || "admin",
  password: process.env.MODEM_PASSWORD || "admin",
};

/**
 * Get or create session for a user
 */
function getUserSession(userId: number): ModemSession {
  if (!userSessions.has(userId)) {
    userSessions.set(userId, { session: null, token: null });
  }
  return userSessions.get(userId)!;
}

/**
 * Clear session for a user
 */
export function clearUserSession(userId: number): void {
  userSessions.delete(userId);
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
 */
export function normalizeTimestamp(timestamp: string): string {
  // Check if already in correct format DD-MM-YYYY, HH:MM:SS
  if (/^\d{2}-\d{2}-\d{4}, \d{2}:\d{2}:\d{2}$/.test(timestamp)) {
    return timestamp;
  }

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
 * Get base URL for modem API
 */
function getBaseURL(config: ModemConfig): string {
  return `http://${config.ip}/api`;
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
 * Common modem gateway IPs to try for auto-detection
 */
const COMMON_MODEM_IPS = [
  "192.168.8.1",   // Huawei default
  "192.168.1.1",   // Generic router
  "192.168.0.1",   // Generic router
  "192.168.100.1", // Some ISPs
  "10.0.0.1",      // Some networks
  "192.168.2.1",   // Alternative
  "192.168.3.1",   // ZTE routers
  "192.168.31.1",  // Xiaomi routers
];

/**
 * Auto-detect modem IP by scanning common gateway addresses
 * Uses /api/webserver/SesTokInfo which doesn't require authentication
 */
export async function autoDetectModemIP(): Promise<{ ip: string; deviceName: string } | null> {
  console.log("🔍 Auto-detecting modem IP...");

  for (const ip of COMMON_MODEM_IPS) {
    try {
      console.log(`  Trying ${ip}...`);
      // Use SesTokInfo endpoint - it doesn't require auth and always responds on Huawei modems
      const response = await axios.get(`http://${ip}/api/webserver/SesTokInfo`, {
        timeout: 2000,
        validateStatus: () => true,
      });

      if (response.data && typeof response.data === 'string') {
        // Check if response contains TokInfo (valid Huawei modem response)
        const tokInfo = parseXMLValue(response.data, "TokInfo");
        if (tokInfo) {
          console.log(`✅ Found Huawei modem at ${ip}`);
          // Try to get device name, but default to "Huawei Modem" if not accessible
          let deviceName = "Huawei Modem";
          try {
            const infoRes = await axios.get(`http://${ip}/api/device/basic_information`, {
              timeout: 2000,
              validateStatus: () => true,
            });
            const name = parseXMLValue(infoRes.data, "devicename") ||
              parseXMLValue(infoRes.data, "DeviceName");
            if (name) deviceName = name;
          } catch {
            // Use default name
          }
          return { ip, deviceName };
        }
      }
    } catch {
      // Continue to next IP
    }
  }

  console.log("❌ No modem found at common IP addresses");
  return null;
}

/**
 * Test if a modem is reachable at the given IP
 * Uses /api/webserver/SesTokInfo which doesn't require authentication
 */
export async function testModemConnection(ip: string): Promise<{ success: boolean; deviceName?: string }> {
  try {
    // Use SesTokInfo endpoint - always responds on Huawei modems without auth
    const response = await axios.get(`http://${ip}/api/webserver/SesTokInfo`, {
      timeout: 5000,
      validateStatus: () => true,
    });

    if (response.data && typeof response.data === 'string') {
      const tokInfo = parseXMLValue(response.data, "TokInfo");
      if (tokInfo) {
        // Try to get device name
        let deviceName = "Huawei Modem";
        try {
          const infoRes = await axios.get(`http://${ip}/api/device/basic_information`, {
            timeout: 2000,
            validateStatus: () => true,
          });
          const name = parseXMLValue(infoRes.data, "devicename") ||
            parseXMLValue(infoRes.data, "DeviceName");
          if (name) deviceName = name;
        } catch {
          // Use default name
        }
        return { success: true, deviceName };
      }
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

/**
 * Get token and session from Huawei modem
 */
export async function getToken(config: ModemConfig): Promise<{ token: string; session: string }> {
  try {
    const res = await axios.get(`${getBaseURL(config)}/webserver/SesTokInfo`, {
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
function encodePassword(username: string, password: string, token: string): string {
  // SHA256 hash of password
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  // Concatenate: username + base64(passwordHash) + token
  const base64PasswordHash = Buffer.from(passwordHash).toString('base64');
  const combined = username + base64PasswordHash + token;

  // SHA256 hash of combined
  const finalHash = crypto.createHash('sha256').update(combined).digest('hex');

  // Base64 encode
  return Buffer.from(finalHash).toString('base64');
}

/**
 * Login to modem with user-specific config
 */
export async function login(config: ModemConfig, userId: number): Promise<boolean> {
  try {
    const userSession = getUserSession(userId);
    const { token, session } = await getToken(config);

    // Check login state
    const stateRes = await axios.get(`${getBaseURL(config)}/user/state-login`, {
      headers: { Cookie: session },
      timeout: 10000,
    });

    const passwordType = parseXMLValue(stateRes.data, "password_type") || "4";

    // Encode password
    const encodedPassword = encodePassword(config.username, config.password, token);

    // Login
    const loginXML = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <Username>${config.username}</Username>
  <Password>${encodedPassword}</Password>
  <password_type>${passwordType}</password_type>
</request>`;

    const loginRes = await axios.post(`${getBaseURL(config)}/user/login`, loginXML, {
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
            userSession.session = `SessionID=${match[1]}`;
          }
        }
      }

      if (!userSession.session) {
        userSession.session = session;
      }

      // Save token from response headers
      const respToken = loginRes.headers['__requestverificationtoken'];
      if (respToken) {
        userSession.token = respToken;
        console.log(`✅ Login successful for user ${userId}, got new token`);
      } else {
        userSession.token = token;
        console.log(`✅ Login successful for user ${userId}`);
      }

      return true;
    }

    const errorCode = parseXMLValue(loginRes.data, "code");
    console.log(`❌ Login failed for user ${userId}: ${errorCode}`);
    return false;
  } catch (error: any) {
    console.error(`Login error for user ${userId}:`, error.message);
    return false;
  }
}

/**
 * Ensure user is logged in before making authenticated requests
 */
async function ensureLogin(config: ModemConfig, userId: number): Promise<boolean> {
  const userSession = getUserSession(userId);
  if (!userSession.session) {
    return await login(config, userId);
  }
  return true;
}

/**
 * Get WAN IP and device info (no auth required)
 */
export async function getWanIP(config: ModemConfig): Promise<ModemInfo> {
  try {
    const res = await axios.get(`${getBaseURL(config)}/device/information`, {
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
export async function getWanIPWithAuth(config: ModemConfig, userId: number): Promise<ModemInfo> {
  try {
    await ensureLogin(config, userId);
    const userSession = getUserSession(userId);
    const { token } = await getToken(config);

    const res = await axios.get(`${getBaseURL(config)}/device/information`, {
      headers: {
        Cookie: userSession.session || "",
        __RequestVerificationToken: token,
      },
      timeout: 10000,
      validateStatus: () => true,
    });

    if (res.data.includes("<error>")) {
      // Try re-login
      clearUserSession(userId);
      await login(config, userId);
      return getWanIPWithAuth(config, userId);
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
 * Check modem connection
 */
export async function checkConnection(config: ModemConfig): Promise<boolean> {
  try {
    await axios.get(`${getBaseURL(config)}/monitoring/traffic-statistics`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get network info (provider)
 */
export async function getNetworkInfo(config: ModemConfig, userId: number): Promise<{ provider: string }> {
  try {
    await ensureLogin(config, userId);
    const userSession = getUserSession(userId);
    const { token } = await getToken(config);

    const res = await axios.get(`${getBaseURL(config)}/net/current-plmn`, {
      headers: {
        Cookie: userSession.session || "",
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
export async function getTrafficStats(config: ModemConfig, userId: number): Promise<{
  currentDownload: number;
  currentUpload: number;
  totalDownload: number;
  totalUpload: number;
  dataUsage: string;
}> {
  try {
    await ensureLogin(config, userId);
    const userSession = getUserSession(userId);
    const { token } = await getToken(config);

    const res = await axios.get(`${getBaseURL(config)}/monitoring/traffic-statistics`, {
      headers: {
        Cookie: userSession.session || "",
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
export async function getSignalInfo(config: ModemConfig, userId: number): Promise<{
  rssi: string;
  rsrp: string;
  rsrq: string;
  sinr: string;
  signalStrength: string;
}> {
  try {
    await ensureLogin(config, userId);
    const userSession = getUserSession(userId);
    const { token } = await getToken(config);

    const res = await axios.get(`${getBaseURL(config)}/device/signal`, {
      headers: {
        Cookie: userSession.session || "",
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
export async function getMonthStats(config: ModemConfig, userId: number): Promise<{
  currentMonthDownload: number;
  currentMonthUpload: number;
  monthUsage: string;
}> {
  try {
    await ensureLogin(config, userId);
    const userSession = getUserSession(userId);
    const { token } = await getToken(config);

    const res = await axios.get(`${getBaseURL(config)}/monitoring/month_statistics`, {
      headers: {
        Cookie: userSession.session || "",
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
export async function getFullModemInfo(config: ModemConfig, userId: number): Promise<ModemInfo> {
  try {
    await ensureLogin(config, userId);

    const [wanInfo, networkInfo, trafficStats] = await Promise.all([
      getWanIPWithAuth(config, userId),
      getNetworkInfo(config, userId),
      getTrafficStats(config, userId),
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
export async function getDetailedModemInfo(config: ModemConfig, userId: number): Promise<{
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
    await ensureLogin(config, userId);

    const [wanInfo, networkInfo, signalInfo, trafficStats, monthStats] = await Promise.all([
      getWanIPWithAuth(config, userId),
      getNetworkInfo(config, userId),
      getSignalInfo(config, userId),
      getTrafficStats(config, userId),
      getMonthStats(config, userId),
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
 * Trigger PLMN network scan
 */
async function triggerPLMNScan(config: ModemConfig, userId: number): Promise<{ success: boolean; networks?: string[] }> {
  try {
    console.log("Requesting PLMN list (network scan)...");

    await ensureLogin(config, userId);
    const userSession = getUserSession(userId);
    const { token } = await getToken(config);

    const res = await axios.get(`${getBaseURL(config)}/net/plmn-list`, {
      headers: {
        Cookie: userSession.session || "",
        __RequestVerificationToken: token,
      },
      timeout: 120000, // 2 minutes timeout
      validateStatus: () => true,
    });

    const responseData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    console.log("PLMN scan response:", responseData.substring(0, 300));

    if (responseData.includes("<error>")) {
      const errorCode = parseXMLValue(responseData, "code");
      console.log(`PLMN scan error code: ${errorCode}`);
      return { success: false };
    }

    const networks: string[] = [];
    const fullNameMatches = responseData.matchAll(/<FullName>([^<]+)<\/FullName>/g);
    for (const match of fullNameMatches) {
      networks.push(match[1]);
    }

    console.log(`Found ${networks.length} networks:`, networks.join(", "));
    return { success: true, networks };
  } catch (error: any) {
    console.error("PLMN scan error:", error.message);
    return { success: false };
  }
}

/**
 * Change IP by triggering PLMN network scan
 */
export async function changeIP(config: ModemConfig, userId: number): Promise<ModemInfo> {
  try {
    console.log(`Starting IP change process for user ${userId}...`);

    // Get old IP first
    const oldInfo = await getWanIPWithAuth(config, userId);
    const oldIP = oldInfo.wan_ip;
    console.log("Old IP:", oldIP);

    // Trigger PLMN scan
    console.log("Triggering PLMN network scan...");
    const scanResult = await triggerPLMNScan(config, userId);

    if (!scanResult.success) {
      console.log("⚠️ PLMN scan may have issues, but continuing...");
    } else {
      console.log("✅ PLMN scan completed");
    }

    // Wait for network reconnection
    console.log("Waiting for network reconnection (15 seconds)...");
    await sleep(15000);

    // Force re-login and get new IP
    clearUserSession(userId);
    await login(config, userId);

    const newInfo = await getWanIPWithAuth(config, userId);
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
 * Reboot modem
 */
export async function rebootModem(config: ModemConfig, userId: number): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("Preparing to reboot modem...");

    clearUserSession(userId);
    const loginSuccess = await login(config, userId);

    if (!loginSuccess) {
      return { success: false, error: "Login failed" };
    }

    const userSession = getUserSession(userId);
    if (!userSession.session) {
      return { success: false, error: "No valid session after login" };
    }

    const { token: freshToken } = await getToken(config);

    console.log("Sending reboot command...");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <Control>1</Control>
</request>`;

    const res = await axios.post(`${getBaseURL(config)}/device/control`, xml, {
      headers: {
        __RequestVerificationToken: freshToken,
        "Content-Type": "application/xml",
        Cookie: userSession.session,
      },
      timeout: 15000,
      validateStatus: () => true,
    });

    const responseData = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    console.log("Reboot response:", responseData.substring(0, 200));

    if (responseData.includes("<response>OK</response>")) {
      return { success: true };
    }

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
 * Set mobile data on/off
 */
export async function setMobileData(config: ModemConfig, userId: number, enabled: boolean): Promise<{ success: boolean; response?: string }> {
  try {
    clearUserSession(userId);
    await login(config, userId);

    const userSession = getUserSession(userId);
    if (!userSession.session) {
      throw new Error("No valid session after login");
    }

    const sessionCookie = userSession.session;
    const { token: freshToken } = await getToken(config);

    const action = enabled ? 1 : 0;
    const actionName = enabled ? "ON" : "OFF";

    console.log(`Setting mobile data ${actionName}...`);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <dataswitch>${action}</dataswitch>
</request>`;

    const res = await axios.post(`${getBaseURL(config)}/dialup/mobile-dataswitch`, xml, {
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
      userSession.token = String(respToken);
    }

    if (responseData.includes("<response>OK</response>")) {
      return { success: true, response: responseData };
    }

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

// ============================================
// Legacy exports for backwards compatibility
// ============================================

// These use the default config from environment variables
// and a dummy user ID of 0 for the global session

/**
 * @deprecated Use setModemIP with per-user config instead
 */
export function setModemIP(_ip: string): void {
  defaultConfig.ip = _ip;
  clearUserSession(0);
}

/**
 * @deprecated Use per-user config instead
 */
export function getModemIP(): string {
  return defaultConfig.ip;
}

/**
 * @deprecated Use per-user config instead
 */
export function setModemCredentials(username: string, password: string): void {
  defaultConfig.username = username;
  defaultConfig.password = password;
  clearUserSession(0);
}

/**
 * @deprecated Use per-user login instead
 */
export async function autoLogin(): Promise<boolean> {
  return login(defaultConfig, 0);
}
