import Store from 'electron-store';
import { LicenseManager } from '../license/LicenseManager';

interface UsageData {
  date: string;
  publishCount: number;
  totalPublishCount: number;
}

interface UsageStore {
  usage: UsageData;
}

const FREE_LIMITS = {
  maxPlatforms: 1,
  dailyPublishLimit: 3,
  maxVideoSizeMB: 100,
};

export class FeatureGuard {
  private licenseManager: LicenseManager;
  private store: Store<UsageStore>;

  constructor(licenseManager: LicenseManager) {
    this.licenseManager = licenseManager;
    this.store = new Store<UsageStore>({
      name: 'usage',
      defaults: {
        usage: {
          date: new Date().toDateString(),
          publishCount: 0,
          totalPublishCount: 0,
        },
      },
    });
  }

  private resetDailyCountIfNeeded(): void {
    const usage = this.store.get('usage');
    const today = new Date().toDateString();
    if (usage.date !== today) {
      this.store.set('usage', {
        ...usage,
        date: today,
        publishCount: 0,
      });
    }
  }

  async checkPublishPermission(platformCount: number): Promise<{ allowed: boolean; reason?: string }> {
    const isPaid = await this.licenseManager.isPaid();

    if (isPaid) {
      return { allowed: true };
    }

    this.resetDailyCountIfNeeded();
    const usage = this.store.get('usage');

    if (platformCount > FREE_LIMITS.maxPlatforms) {
      return {
        allowed: false,
        reason: `免费版每次最多发布到 ${FREE_LIMITS.maxPlatforms} 个平台，请升级到付费版`,
      };
    }

    if (usage.publishCount >= FREE_LIMITS.dailyPublishLimit) {
      return {
        allowed: false,
        reason: `免费版每天最多发布 ${FREE_LIMITS.dailyPublishLimit} 次，请明天再试或升级到付费版`,
      };
    }

    return { allowed: true };
  }

  async recordPublish(): Promise<void> {
    this.resetDailyCountIfNeeded();
    const usage = this.store.get('usage');
    this.store.set('usage', {
      ...usage,
      publishCount: usage.publishCount + 1,
      totalPublishCount: usage.totalPublishCount + 1,
    });
  }

  async getUsageStats(): Promise<UsageData> {
    this.resetDailyCountIfNeeded();
    return this.store.get('usage');
  }

  getFreeLimits() {
    return FREE_LIMITS;
  }
}
