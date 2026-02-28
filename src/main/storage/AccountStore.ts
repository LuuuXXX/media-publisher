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
      // 无法获取机器 ID 时，生成并持久化一个随机备用密钥
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
    // 回退方案：AES-256-GCM 加密（带完整性校验，防止密文篡改）
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.machineKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();
    return `gcm:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  }

  private decrypt(encrypted: string): string {
    if (encrypted.startsWith('aes:')) {
      // 兼容旧版 AES-256-CBC 格式
      const parts = encrypted.split(':');
      const iv = Buffer.from(parts[1], 'base64');
      const encryptedText = parts[2];
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.machineKey, iv);
      let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
    if (encrypted.startsWith('gcm:')) {
      // AES-256-GCM 解密（带完整性校验）
      const parts = encrypted.split(':');
      const iv = Buffer.from(parts[1], 'base64');
      const authTag = Buffer.from(parts[2], 'base64');
      const encryptedText = parts[3];
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.machineKey, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
    }
    throw new Error('无法解密：加密功能不可用');
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

  private deriveKeyFromPassword(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, 32, (err, derivedKey) => {
        if (err) reject(err); else resolve(derivedKey);
      });
    });
  }

  async toggleAccountEnabled(platform: string, enabled: boolean): Promise<void> {
    const accounts = this.store.get('accounts');
    if (accounts[platform]) {
      accounts[platform] = { ...accounts[platform], enabled, updatedAt: new Date().toISOString() };
      this.store.set('accounts', accounts);
    }
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
    // 使用 scrypt 派生密钥（带随机 salt），避免弱密码被离线暴力破解
    const salt = crypto.randomBytes(32);
    const key = await this.deriveKeyFromPassword(password, salt);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(exportData, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();
    const fileContent = JSON.stringify({
      version: '2.0',
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      data: encrypted,
    });
    await fs.promises.writeFile(filePath, fileContent, 'utf8');
  }

  async importAccounts(filePath: string, password: string): Promise<void> {
    const fileContent = await fs.promises.readFile(filePath, 'utf8');
    const parsed = JSON.parse(fileContent);
    let decrypted: string;
    if (parsed.version === '2.0') {
      // v2：AES-256-GCM + scrypt 密钥派生
      const salt = Buffer.from(parsed.salt, 'base64');
      const key = await this.deriveKeyFromPassword(password, salt);
      const iv = Buffer.from(parsed.iv, 'base64');
      const authTag = Buffer.from(parsed.authTag, 'base64');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      decrypted = decipher.update(parsed.data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
    } else {
      // v1 兼容：AES-256-CBC + sha256 密钥派生
      const key = crypto.createHash('sha256').update(password).digest();
      const iv = Buffer.from(parsed.iv, 'base64');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      decrypted = decipher.update(parsed.data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
    }
    const importedAccounts = JSON.parse(decrypted);
    for (const [platform, account] of Object.entries(importedAccounts as Record<string, { username: string; password: string; enabled: boolean }>)) {
      await this.saveAccount(platform, account);
    }
  }
}
