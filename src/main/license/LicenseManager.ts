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
      console.error('[LicenseManager] LICENSE_HMAC_SECRET is not set. License signatures cannot be trusted in production.');
    }
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
      return crypto.randomBytes(16).toString('hex');
    }
  }

  private signLicense(data: Omit<LicenseData, 'signature'>): string {
    const payload = JSON.stringify(data);
    return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
  }

  private verifySignature(license: LicenseData): boolean {
    const { signature, ...data } = license;
    const expectedSignature = this.signLicense(data);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  async initialize(): Promise<void> {
    const license = this.store.get('license');
    if (license) {
      // Check if periodic re-verification is needed
      const lastVerified = new Date(license.lastVerifiedAt);
      const daysSinceVerification = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceVerification >= VERIFY_INTERVAL_DAYS) {
        await this.verifyLicense().catch(() => {
          // Ignore network errors - use cached license
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
        // Offline activation (for testing)
        return { success: false, error: '无法连接到授权服务器' };
      }
      return { success: false, error: (error as Error).message };
    }
  }

  async verifyLicense(): Promise<boolean> {
    const license = this.store.get('license');
    if (!license) return false;

    // Verify local signature first
    if (!this.verifySignature(license)) {
      this.store.set('license', null);
      return false;
    }

    // Check expiration
    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      return false;
    }

    try {
      // Online verification
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
      // Use cached license on network error
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
