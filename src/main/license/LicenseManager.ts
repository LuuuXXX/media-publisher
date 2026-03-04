import Store from 'electron-store';
import * as crypto from 'crypto';
import axios from 'axios';
import { app } from 'electron';
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
  if (secret) {
    return secret;
  }
  if (app.isPackaged) {
    // 打包环境中不允许使用内置默认密钥，必须在构建/运行时通过环境变量注入 LICENSE_HMAC_SECRET。
    console.error(
      '[LicenseManager] 打包环境未设置 LICENSE_HMAC_SECRET，许可证签名校验将无法正常工作。' +
        ' 请在构建或运行时通过环境变量注入生产密钥。',
    );
    // 返回空字符串以确保后续签名/验签操作失败，而不是使用可被提取的硬编码密钥。
    return '';
  }
  // 非打包环境回退到固定默认值，仅用于开发调试，请勿在生产中依赖。
  return 'media-publisher-default-secret';
})();
const DEFAULT_LICENSE_SERVER = 'https://your-domain.com/api';
const LICENSE_SERVER = (() => {
  const fromEnv = process.env.LICENSE_SERVER;
  if (fromEnv) {
    return fromEnv;
  }
  if (app.isPackaged) {
    // 打包环境下仍为占位值，记录错误并返回空字符串，避免对占位地址发起请求。
    console.error(
      '[LicenseManager] 打包环境未设置 LICENSE_SERVER，无法进行许可证激活/校验。' +
        ' 请在构建流程中通过环境变量注入生产授权服务器地址（LICENSE_SERVER）。',
    );
    return '';
  }
  // 非打包环境保留占位默认值，便于本地开发调试。
  return DEFAULT_LICENSE_SERVER;
})();
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
    if (typeof HMAC_SECRET !== 'string' || HMAC_SECRET.trim() === '') {
      throw new Error('HMAC secret 未配置，无法签名许可证。');
    }
    const payload = JSON.stringify(data);
    return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
  }

  private verifySignature(license: LicenseData): boolean {
    // 当 HMAC_SECRET 未正确配置时，禁止进行验签，直接返回失败
    if (typeof HMAC_SECRET !== 'string' || HMAC_SECRET.trim() === '') {
      return false;
    }
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
    if (!LICENSE_SERVER) {
      return { success: false, error: '授权服务器地址未配置，无法激活许可证。' };
    }
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

    // 检查是否已过期，过期时同步清除本地缓存
    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      this.store.set('license', null);
      return false;
    }

    if (!LICENSE_SERVER) {
      // 授权服务器未配置，跳过在线验证，依赖本地缓存（已通过签名与过期校验）
      return true;
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
      // 服务器校验未通过时，清除本地缓存的 license，防止吊销失效无法生效
      this.store.set('license', null);
      return false;
    } catch {
      // 网络错误时使用缓存的许可证
      return license.isPaid;
    }
  }

  async getLicenseInfo(): Promise<LicenseData | null> {
    const license = this.store.get('license');
    if (!license) return null;
    // 返回前校验签名与过期时间，失败时清理缓存
    if (!this.verifySignature(license)) {
      this.store.set('license', null);
      return null;
    }
    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      this.store.set('license', null);
      return null;
    }
    return license;
  }

  async isPaid(): Promise<boolean> {
    const license = await this.getLicenseInfo();
    if (!license) return false;
    return license.isPaid;
  }
}
