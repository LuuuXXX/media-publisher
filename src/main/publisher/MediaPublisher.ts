import { BasePublisher, PublishOptions, PublishResult } from './base/BasePublisher';
import { DouyinPublisher } from './douyin';
import { BilibiliPublisher } from './bilibili';
import { XiaohongshuPublisher } from './xiaohongshu';
import { WeiboPublisher } from './weibo';
import { KuaishouPublisher } from './kuaishou';
import { ToutiaoPublisher } from './toutiao';
import { XiguaPublisher } from './xigua';
import { ZhihuPublisher } from './zhihu';
import { JianshuPublisher } from './jianshu';
import { AccountStore } from '../storage/AccountStore';

export interface MediaPublishOptions {
  filePath: string;
  platforms: string[];
  title: string;
  description: string;
  tags: string[];
}

export class MediaPublisher {
  private publishers: Map<string, BasePublisher>;
  private accountStore: AccountStore;

  constructor(accountStore?: AccountStore) {
    this.accountStore = accountStore ?? new AccountStore();
    this.publishers = new Map([
      ['douyin', new DouyinPublisher()],
      ['bilibili', new BilibiliPublisher()],
      ['xiaohongshu', new XiaohongshuPublisher()],
      ['weibo', new WeiboPublisher()],
      ['kuaishou', new KuaishouPublisher()],
      ['toutiao', new ToutiaoPublisher()],
      ['xigua', new XiguaPublisher()],
      ['zhihu', new ZhihuPublisher()],
      ['jianshu', new JianshuPublisher()],
    ]);
  }

  async publish(options: MediaPublishOptions): Promise<PublishResult[]> {
    const results: PublishResult[] = [];

    for (const platform of options.platforms) {
      const publisher = this.publishers.get(platform);
      if (!publisher) {
        results.push({
          platform,
          success: false,
          error: `不支持的平台: ${platform}`,
          publishedAt: new Date().toISOString(),
        });
        continue;
      }

      const account = await this.accountStore.getAccount(platform);
      if (!account) {
        results.push({
          platform,
          success: false,
          error: `平台 ${platform} 未配置账户`,
          publishedAt: new Date().toISOString(),
        });
        continue;
      }

      if (!account.enabled) {
        results.push({
          platform,
          success: false,
          error: `平台 ${platform} 已禁用`,
          publishedAt: new Date().toISOString(),
        });
        continue;
      }

      try {
        const result = await publisher.publish({
          ...options,
          account,
        } as PublishOptions);
        results.push({ ...result, platform });
      } catch (error) {
        results.push({
          platform,
          success: false,
          error: (error as Error).message,
          publishedAt: new Date().toISOString(),
        });
      }
    }

    return results;
  }
}
