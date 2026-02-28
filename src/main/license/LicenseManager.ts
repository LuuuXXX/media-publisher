import Store from 'electron-store';
import * as crypto from 'crypto';
import axios from 'axios';
import { machineIdSync } from 'node-machine-id';

interface LicenseData {
  key: string;
  deviceId: string;
  activatedAt: string;
  expiresAt: string | null;
  lastVerifiedAt: string;
  isPaid: boolean;
  signature: string;
}

interface LicenseStore {
  license: LicenseData | null;
}

const HMAC_SECRET = (() => {
  const secret = process.env.LICENSE_HMAC_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[LicenseManager] 生产环境未设置 LICENSE_HMAC_SECRET，许可证签名无法信任，拒绝启动。');
      throw new Error('[LicenseManager] 生产环境缺少 LICENSE_HMAC_SECRET 环境变量。');
    }
    // 非生产环境回退到固定默认值，仅用于开发调试。
    return 'media-publisher-default-secret';
  }
  return secret;
})();
const LICENSE_SERVER = process.env.LICENSE_SERVER || 'https://your-domain.com/api';
const VERIFY_INTERVAL_DAYS = 30;

export class LicenseManager {
  private store: Store<LicenseStore>;
  private deviceId: string;

  constructor() {
    this.store = new Store<LicenseStore>({
      name: 'license',
      defaults: { license: null },
    });
    this.deviceId = this.getDeviceId();
  }

  private getDeviceId(): string {
    try {
      return machineIdSync();
    } catch {
      // 当无法获取系统 machineId 时，回退到持久化的随机 deviceId，
      // 确保同一台机器在多次启动之间保持稳定。
      const fallbackStore = new Store<{ fallbackDeviceId?: string }>({
        name: 'license-device',
        defaults: {},
      });
      let fallbackId = fallbackStore.get('fallbackDeviceId');
      if (!fallbackId) {
        fallbackId = crypto.randomBytes(16).toString('hex');
        fallbackStore.set('fallbackDeviceId', fallbackId);
      }
      return fallbackId;
    }
  }

  private signLicense(data: Omit<LicenseData, 'signature'>): string {
    const payload = JSON.stringify(data);
    return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
  }

  private verifySignature(license: LicenseData): boolean {
    const { signature, ...data } = license;
    const expectedSignature = this.signLicense(data);
    // 使用 timingSafeEqual 前先验证签名格式
    const hexPattern = /^[0-9a-fA-F]+$/;
    if (typeof signature !== 'string' || !hexPattern.test(signature) || signature.length !== expectedSignature.length) {
      return false;
    }
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch {
      return false;
    }
  }

  async initialize(): Promise<void> {
    const license = this.store.get('license');
    if (license) {
      // 定期检查是否需要重新在线验证
      const lastVerified = new Date(license.lastVerifiedAt);
      const daysSinceVerification = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceVerification >= VERIFY_INTERVAL_DAYS) {
        await this.verifyLicense().catch(() => {
          // 网络错误时忽略，继续使用缓存的许可证
        });
      }
    }
  }

  async activateLicense(key: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await axios.post(`${LICENSE_SERVER}/license/activate`, {
        key,
        deviceId: this.deviceId,
      }, { timeout: 10000 });

      if (response.data.success) {
        const licenseData: Omit<LicenseData, 'signature'> = {
          key,
          deviceId: this.deviceId,
          activatedAt: new Date().toISOString(),
          expiresAt: response.data.expiresAt || null,
          lastVerifiedAt: new Date().toISOString(),
          isPaid: true,
        };
        const signature = this.signLicense(licenseData);
        this.store.set('license', { ...licenseData, signature });
        return { success: true };
      }
      return { success: false, error: response.data.error || '激活失败' };
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        // 离线激活（测试用）
        return { success: false, error: '无法连接到授权服务器' };
      }
      return { success: false, error: (error as Error).message };
    }
  }

  async verifyLicense(): Promise<boolean> {
    const license = this.store.get('license');
    if (!license) return false;

    // 先验证本地签名
    if (!this.verifySignature(license)) {
      this.store.set('license', null);
      return false;
    }

    // 检查是否已过期
    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      return false;
    }

    try {
      // 在线验证
      const response = await axios.post(`${LICENSE_SERVER}/license/verify`, {
        key: license.key,
        deviceId: this.deviceId,
      }, { timeout: 10000 });

      if (response.data.valid) {
        const { signature: _sig, ...licenseWithoutSig } = license;
        const updated = {
          ...license,
          lastVerifiedAt: new Date().toISOString(),
        };
        updated.signature = this.signLicense({ ...licenseWithoutSig, lastVerifiedAt: updated.lastVerifiedAt });
        this.store.set('license', updated);
        return true;
      }
      return false;
    } catch {
      // 网络错误时使用缓存的许可证
      return license.isPaid;
    }
  }

  async getLicenseInfo(): Promise<LicenseData | null> {
    return this.store.get('license');
  }

  async isPaid(): Promise<boolean> {
    const license = this.store.get('license');
    if (!license) return false;
    if (!this.verifySignature(license)) return false;
    if (license.expiresAt && new Date(license.expiresAt) < new Date()) return false;
    return license.isPaid;
  }
}
