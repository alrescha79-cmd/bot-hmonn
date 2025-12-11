import { readFile, writeFile } from "fs/promises";
import { ModemInfo } from "./modem";

const STORAGE_FILE = "./storage.json";

export interface StorageData {
  lastIP?: string;
  lastChangeTimestamp?: string;
  loginCredentials?: {
    username: string;
    password: string;
  };
}

/**
 * Read storage data
 */
export async function readStorage(): Promise<StorageData> {
  try {
    const data = await readFile(STORAGE_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or invalid JSON, return empty object
    return {};
  }
}

/**
 * Write storage data
 */
export async function writeStorage(data: StorageData): Promise<void> {
  try {
    await writeFile(STORAGE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing storage:", error);
  }
}

/**
 * Update IP change timestamp
 */
export async function updateIPChange(info: ModemInfo): Promise<void> {
  const storage = await readStorage();
  storage.lastIP = info.wan_ip;
  storage.lastChangeTimestamp = info.timestamp;
  await writeStorage(storage);
}

/**
 * Get last IP info
 */
export async function getLastIPInfo(): Promise<{ ip?: string; timestamp?: string }> {
  const storage = await readStorage();
  return {
    ip: storage.lastIP,
    timestamp: storage.lastChangeTimestamp,
  };
}

/**
 * Save login credentials
 */
export async function saveCredentials(username: string, password: string): Promise<void> {
  const storage = await readStorage();
  storage.loginCredentials = { username, password };
  await writeStorage(storage);
}

/**
 * Get saved credentials
 */
export async function getCredentials(): Promise<{ username?: string; password?: string }> {
  const storage = await readStorage();
  return storage.loginCredentials || {};
}
