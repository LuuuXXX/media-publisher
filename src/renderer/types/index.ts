export interface Platform {
  id: string;
  name: string;
  logo: string;
  loginType: 'qrcode' | 'password';
  category: 'video' | 'article' | 'both';
}

export interface Account {
  username: string;
  password?: string;
  enabled: boolean;
  updatedAt?: string;
}

export interface AccountInfo {
  username: string;
  enabled: boolean;
  updatedAt: string;
}

export interface LicenseInfo {
  key: string;
  deviceId: string;
  activatedAt: string;
  expiresAt: string | null;
  lastVerifiedAt: string;
  isPaid: boolean;
}

export interface PublishResult {
  platform: string;
  success: boolean;
  url?: string;
  error?: string;
  publishedAt: string;
}

export interface PublishHistory {
  id: string;
  filePath: string;
  title: string;
  platforms: string[];
  results: PublishResult[];
  createdAt: string;
}

export type MediaType = 'video' | 'image' | 'article' | 'unknown';

export interface MediaFile {
  path: string;
  name: string;
  size: number;
  type: MediaType;
}

export const PLATFORM_CONFIG: Platform[] = [
  { id: 'douyin', name: '抖音', logo: 'logos/douyin.svg', loginType: 'qrcode', category: 'video' },
  { id: 'bilibili', name: 'B站', logo: 'logos/bilibili.svg', loginType: 'password', category: 'video' },
  { id: 'kuaishou', name: '快手', logo: 'logos/kuaishou.svg', loginType: 'qrcode', category: 'video' },
  { id: 'xigua', name: '西瓜视频', logo: 'logos/xigua.svg', loginType: 'password', category: 'video' },
  { id: 'toutiao', name: '今日头条', logo: 'logos/toutiao.svg', loginType: 'password', category: 'article' },
  { id: 'zhihu', name: '知乎', logo: 'logos/zhihu.svg', loginType: 'password', category: 'article' },
  { id: 'jianshu', name: '简书', logo: 'logos/jianshu.svg', loginType: 'password', category: 'article' },
  { id: 'xiaohongshu', name: '小红书', logo: 'logos/xiaohongshu.svg', loginType: 'qrcode', category: 'both' },
  { id: 'weibo', name: '微博', logo: 'logos/weibo.svg', loginType: 'password', category: 'both' },
];
