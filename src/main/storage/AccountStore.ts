import { safeStorage } from 'electron';
import Store from 'electron-store';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { machineIdSync } from 'node-machine-id';

interface AccountData {
  username: string;
  encryptedPassword: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StoreSchema {
  accounts: Record<string, AccountData>;
}

export class AccountStore {
  private store: Store<StoreSchema>;
  private machineKey: Buffer;

  constructor() {
    this.store = new Store<StoreSchema>({
      name: 'accounts',
      defaults: { accounts: {} },
    });
    this.machineKey = this.generateMachineKey();
  }

  private generateMachineKey(): Buffer {
    try {
      const machineId = machineIdSync();
      return crypto.createHash('sha256').update(machineId).digest();
    } catch {
      // When machine ID is unavailable, generate and persist a random fallback key
      const fallbackStore = new Store<{ key: string }>({ name: 'fallback-key', defaults: { key: '' } });
      let storedKey = fallbackStore.get('key');
      if (!storedKey) {
        storedKey = crypto.randomBytes(32).toString('base64');
        fallbackStore.set('key', storedKey);
      }
      return Buffer.from(storedKey, 'base64');
    }
  }

  private encrypt(text: string): string {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(text).toString('base64');
    }
    // Fallback: AES-256-CBC encryption
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.machineKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return `aes:${iv.toString('base64')}:${encrypted}`;
  }

  private decrypt(encrypted: string): string {
    if (encrypted.startsWith('aes:')) {
      // AES-256-CBC decryption
      const parts = encrypted.split(':');
      const iv = Buffer.from(parts[1], 'base64');
      const encryptedText = parts[2];
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.machineKey, iv);
      let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
    }
    throw new Error('Cannot decrypt: encryption not available');
  }

  async saveAccount(platform: string, account: { username: string; password: string; enabled?: boolean }): Promise<void> {
    const accounts = this.store.get('accounts');
    const encryptedPassword = this.encrypt(account.password);
    accounts[platform] = {
      username: account.username,
      encryptedPassword,
      enabled: account.enabled !== false,
      createdAt: accounts[platform]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.store.set('accounts', accounts);
  }

  async getAccount(platform: string): Promise<{ username: string; password: string; enabled: boolean } | null> {
    const accounts = this.store.get('accounts');
    const account = accounts[platform];
    if (!account) return null;
    return {
      username: account.username,
      password: this.decrypt(account.encryptedPassword),
      enabled: account.enabled,
    };
  }

  async getAllAccounts(): Promise<Record<string, { username: string; enabled: boolean; updatedAt: string }>> {
    const accounts = this.store.get('accounts');
    const result: Record<string, { username: string; enabled: boolean; updatedAt: string }> = {};
    for (const [platform, account] of Object.entries(accounts)) {
      result[platform] = {
        username: account.username,
        enabled: account.enabled,
        updatedAt: account.updatedAt,
      };
    }
    return result;
  }

  async deleteAccount(platform: string): Promise<void> {
    const accounts = this.store.get('accounts');
    delete accounts[platform];
    this.store.set('accounts', accounts);
  }

  async exportAccounts(filePath: string, password: string): Promise<void> {
    const accounts = this.store.get('accounts');
    const decryptedAccounts: Record<string, { username: string; password: string; enabled: boolean }> = {};
    for (const [platform, account] of Object.entries(accounts)) {
      decryptedAccounts[platform] = {
        username: account.username,
        password: this.decrypt(account.encryptedPassword),
        enabled: account.enabled,
      };
    }
    const exportData = JSON.stringify(decryptedAccounts);
    const key = crypto.createHash('sha256').update(password).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(exportData, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const fileContent = JSON.stringify({
      version: '1.0',
      iv: iv.toString('base64'),
      data: encrypted,
    });
    fs.writeFileSync(filePath, fileContent, 'utf8');
  }

  async importAccounts(filePath: string, password: string): Promise<void> {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { iv, data } = JSON.parse(fileContent);
    const key = crypto.createHash('sha256').update(password).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'base64'));
    let decrypted = decipher.update(data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    const importedAccounts = JSON.parse(decrypted);
    for (const [platform, account] of Object.entries(importedAccounts as Record<string, { username: string; password: string; enabled: boolean }>)) {
      await this.saveAccount(platform, account);
    }
  }
}
