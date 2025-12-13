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
 * Change IP by forcing network re-registration
 * Uses token saved from login for POST requests
 */
export async function changeIP(): Promise<ModemInfo> {
  try {
    console.log("Starting IP change process...");

    // Get old IP first
    const oldInfo = await getWanIPWithAuth();
    const oldIP = oldInfo.wan_ip;
    console.log("Old IP:", oldIP);

    // Force fresh login to get synchronized token+session
    console.log("Getting fresh login session...");
    currentSession = null;
    currentToken = null;
    const loginSuccess = await autoLogin();
    if (!loginSuccess) {
      throw new Error("Login required");
    }

    // Use the token saved from login
    if (!currentToken || !currentSession) {
      throw new Error("No valid token/session after login");
    }
    let postToken: string = currentToken;
    const postSession: string = currentSession;

    console.log("Token for POST:", postToken.substring(0, 20) + "...");
    console.log("Session:", postSession.substring(0, 30) + "...");

    // Disconnect via dialup/dial
    console.log("Disconnecting PPP connection...");

    const dialDisconnectXML = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <Action>0</Action>
</request>`;

    const dialDisconnectRes = await axios.post(`${getBaseURL()}/dialup/dial`, dialDisconnectXML, {
      headers: {
        __RequestVerificationToken: postToken,
        "Content-Type": "application/xml",
        Cookie: postSession,
      },
      timeout: 15000,
      validateStatus: () => true,
    });

    const disconnectData = dialDisconnectRes.data;
    console.log("Disconnect response:", disconnectData.substring(0, 150));

    // Check response and save new token if provided
    const disconnectRespToken = dialDisconnectRes.headers['__requestverificationtoken'];
    if (disconnectRespToken) {
      postToken = String(disconnectRespToken);
      console.log("Got new token from disconnect response");
    }

    if (disconnectData.includes("<response>OK</response>")) {
      console.log("✅ Disconnect successful");
    } else {
      console.log("⚠️ Disconnect may have failed, continuing anyway...");
    }

    // Wait for disconnect
    await sleep(5000);

    // Reconnect - re-login to get fresh token
    console.log("Reconnecting PPP connection...");
    currentSession = null;
    currentToken = null;
    await autoLogin();

    if (!currentToken || !currentSession) {
      throw new Error("Re-login failed");
    }
    postToken = currentToken;

    const dialConnectXML = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <Action>1</Action>
</request>`;

    const dialConnectRes = await axios.post(`${getBaseURL()}/dialup/dial`, dialConnectXML, {
      headers: {
        __RequestVerificationToken: postToken,
        "Content-Type": "application/xml",
        Cookie: currentSession || "",
      },
      timeout: 15000,
      validateStatus: () => true,
    });

    const connectData = dialConnectRes.data;
    console.log("Reconnect response:", connectData.substring(0, 150));

    if (connectData.includes("<response>OK</response>")) {
      console.log("✅ Reconnect successful");
    } else {
      console.log("⚠️ Reconnect may have failed");
    }

    console.log("Waiting for new IP assignment...");
    await sleep(10000);

    // Force re-login and get new IP
    currentSession = null;
    currentToken = null;
    await autoLogin();

    const newInfo = await getWanIPWithAuth();

    newInfo.timestamp = new Date().toLocaleString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    console.log("IP change completed:");
    console.log("  Old IP:", oldIP);
    console.log("  New IP:", newInfo.wan_ip);

    if (oldIP === newInfo.wan_ip) {
      console.log("⚠️ IP did not change. This may be normal - ISP may assign the same IP.");
    } else {
      console.log("✅ IP changed successfully!");
    }

    return newInfo;
  } catch (error: any) {
    console.error("Error changing IP:", error.message);
    throw new Error("Gagal mengganti IP: " + error.message);
  }
}

