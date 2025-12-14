import { readFile, writeFile, mkdir, unlink, access } from "fs/promises";
import { join, dirname } from "path";

// User data directory for per-user configuration
const USER_DATA_DIR = "./user_data";

/**
 * User-specific configuration stored per Telegram user ID
 */
export interface UserConfig {
  modemIP?: string;
  modemUsername?: string;
  modemPassword?: string;
  lastIP?: string;
  lastChangeTimestamp?: string;
  lastLoginAt?: string;
}

/**
 * Legacy storage data interface (for backwards compatibility)
 */
export interface StorageData {
  lastIP?: string;
  lastChangeTimestamp?: string;
  loginCredentials?: {
    username: string;
    password: string;
  };
  modemConfig?: {
    ip: string;
    username: string;
    password: string;
  };
}

/**
 * Get the file path for a user's config
 */
function getUserConfigPath(userId: number): string {
  return join(USER_DATA_DIR, `${userId}.json`);
}

/**
 * Ensure user data directory exists
 */
async function ensureUserDataDir(): Promise<void> {
  try {
    await mkdir(USER_DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists, ignore
  }
}

/**
 * Read user configuration from file
 */
export async function getUserConfig(userId: number): Promise<UserConfig> {
  try {
    const filePath = getUserConfigPath(userId);
    const data = await readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or invalid JSON, return empty config
    return {};
  }
}

/**
 * Save user configuration to file
 */
export async function saveUserConfig(userId: number, config: UserConfig): Promise<void> {
  try {
    await ensureUserDataDir();
    const filePath = getUserConfigPath(userId);
    await writeFile(filePath, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    console.error(`Error saving user config for ${userId}:`, error);
    throw error;
  }
}

/**
 * Delete user configuration file
 */
export async function deleteUserConfig(userId: number): Promise<void> {
  try {
    const filePath = getUserConfigPath(userId);
    await unlink(filePath);
  } catch (error) {
    // File doesn't exist, ignore
  }
}

/**
 * Check if user has been configured
 */
export async function hasUserConfig(userId: number): Promise<boolean> {
  try {
    const config = await getUserConfig(userId);
    return !!(config.modemIP && config.modemUsername && config.modemPassword);
  } catch {
    return false;
  }
}

/**
 * Update user's last IP change info
 */
export async function updateUserIPChange(
  userId: number,
  wanIP: string,
  timestamp: string
): Promise<void> {
  const config = await getUserConfig(userId);
  config.lastIP = wanIP;
  config.lastChangeTimestamp = timestamp;
  await saveUserConfig(userId, config);
}

/**
 * Get user's last IP info
 */
export async function getUserLastIPInfo(
  userId: number
): Promise<{ ip?: string; timestamp?: string }> {
  const config = await getUserConfig(userId);
  return {
    ip: config.lastIP,
    timestamp: config.lastChangeTimestamp,
  };
}

/**
 * Save user's modem configuration (IP, username, password)
 */
export async function saveUserModemConfig(
  userId: number,
  modemIP: string,
  modemUsername: string,
  modemPassword: string
): Promise<void> {
  const config = await getUserConfig(userId);
  config.modemIP = modemIP;
  config.modemUsername = modemUsername;
  config.modemPassword = modemPassword;
  config.lastLoginAt = new Date().toISOString();
  await saveUserConfig(userId, config);
}

/**
 * Get user's modem configuration
 */
export async function getUserModemConfig(
  userId: number
): Promise<{ ip?: string; username?: string; password?: string }> {
  const config = await getUserConfig(userId);
  return {
    ip: config.modemIP,
    username: config.modemUsername,
    password: config.modemPassword,
  };
}

// ============================================
// Legacy functions for backwards compatibility
// ============================================

const LEGACY_STORAGE_FILE = "./storage.json";

/**
 * Read legacy storage data
 * @deprecated Use getUserConfig instead
 */
export async function readStorage(): Promise<StorageData> {
  try {
    const data = await readFile(LEGACY_STORAGE_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

/**
 * Write legacy storage data
 * @deprecated Use saveUserConfig instead
 */
export async function writeStorage(data: StorageData): Promise<void> {
  try {
    await writeFile(LEGACY_STORAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing storage:", error);
  }
}

/**
 * @deprecated Use updateUserIPChange instead
 */
export async function updateIPChange(info: { wan_ip: string; timestamp?: string }): Promise<void> {
  const storage = await readStorage();
  storage.lastIP = info.wan_ip;
  storage.lastChangeTimestamp = info.timestamp;
  await writeStorage(storage);
}

/**
 * @deprecated Use getUserLastIPInfo instead
 */
export async function getLastIPInfo(): Promise<{ ip?: string; timestamp?: string }> {
  const storage = await readStorage();
  return {
    ip: storage.lastIP,
    timestamp: storage.lastChangeTimestamp,
  };
}

/**
 * @deprecated Use saveUserModemConfig instead
 */
export async function saveCredentials(username: string, password: string): Promise<void> {
  const storage = await readStorage();
  storage.loginCredentials = { username, password };
  await writeStorage(storage);
}

/**
 * @deprecated Use getUserModemConfig instead
 */
export async function getCredentials(): Promise<{ username?: string; password?: string }> {
  const storage = await readStorage();
  return storage.loginCredentials || {};
}

/**
 * @deprecated Use saveUserModemConfig instead
 */
export async function saveModemConfig(config: {
  ip: string;
  username: string;
  password: string;
}): Promise<void> {
  const storage = await readStorage();
  storage.modemConfig = config;
  await writeStorage(storage);
}

/**
 * @deprecated Use getUserModemConfig instead
 */
export async function getModemConfig(): Promise<{
  ip: string;
  username: string;
  password: string;
} | null> {
  const storage = await readStorage();
  return storage.modemConfig || null;
}
