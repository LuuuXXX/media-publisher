import type { AccountInfo, LicenseInfo, PublishResult, PublishHistory } from './index';

declare global {
  const __APP_VERSION__: string;

  interface Window {
    electronAPI: {
      account: {
        save: (platform: string, account: { username: string; password: string; enabled?: boolean }) => Promise<{ success: boolean; error?: string }>;
        get: (platform: string) => Promise<{ success: boolean; data?: { username: string; password: string; enabled: boolean } }>;
        getAll: () => Promise<{ success: boolean; data?: Record<string, AccountInfo> }>;
        delete: (platform: string) => Promise<{ success: boolean; error?: string }>;
        export: (password: string) => Promise<{ success: boolean; error?: string }>;
        import: (password: string) => Promise<{ success: boolean; error?: string }>;
        test: (platform: string) => Promise<{ success: boolean; message?: string; error?: string }>;
        toggleEnabled: (platform: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      };
      license: {
        activate: (key: string) => Promise<{ success: boolean; error?: string }>;
        getInfo: () => Promise<{ success: boolean; data?: LicenseInfo }>;
        verify: () => Promise<{ success: boolean; valid?: boolean }>;
        isPaid: () => Promise<{ success: boolean; paid?: boolean }>;
      };
      payment: {
        createOrder: (method: string) => Promise<{ success: boolean; data?: { orderId: string; qrCodeUrl: string; amount: number } }>;
        checkOrder: (orderId: string) => Promise<{ success: boolean; data?: { status: string; licenseKey: string } }>;
      };
      publish: {
        media: (options: { filePath: string; platforms: string[]; title: string; description: string; tags: string[] }) => Promise<{ success: boolean; data?: PublishResult[]; error?: string }>;
        getHistory: () => Promise<{ success: boolean; data?: PublishHistory[] }>;
      };
    };
  }
}

export {};
