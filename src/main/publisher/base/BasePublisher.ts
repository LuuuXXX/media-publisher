export interface PublishOptions {
  filePath: string;
  title: string;
  description: string;
  tags: string[];
  account: {
    username: string;
    password: string;
  };
}

export interface PublishResult {
  platform: string;
  success: boolean;
  url?: string;
  error?: string;
  publishedAt: string;
}

export abstract class BasePublisher {
  abstract readonly platformId: string;
  abstract readonly platformName: string;

  abstract publish(options: PublishOptions): Promise<PublishResult>;

  protected createSuccessResult(url?: string): Omit<PublishResult, 'platform'> {
    return {
      success: true,
      url,
      publishedAt: new Date().toISOString(),
    };
  }

  protected createErrorResult(error: string): Omit<PublishResult, 'platform'> {
    return {
      success: false,
      error,
      publishedAt: new Date().toISOString(),
    };
  }
}
