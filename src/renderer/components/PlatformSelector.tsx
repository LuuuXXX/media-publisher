import React from 'react';
import { Card, Checkbox, Typography, Tag, Button, Space, Avatar } from 'antd';
import type { Platform, MediaType, AccountInfo } from '../types';
import { PLATFORM_CONFIG } from '../types';

interface PlatformSelectorProps {
  mediaType: MediaType;
  accounts: Record<string, AccountInfo>;
  selectedPlatforms: string[];
  onSelectionChange: (platforms: string[]) => void;
  onPublish: () => void;
  publishing: boolean;
}

function getAvailablePlatforms(mediaType: MediaType): Platform[] {
  if (mediaType === 'video') {
    return PLATFORM_CONFIG.filter(p => p.category === 'video' || p.category === 'both');
  }
  if (mediaType === 'article') {
    return PLATFORM_CONFIG.filter(p => p.category === 'article' || p.category === 'both');
  }
  if (mediaType === 'image') {
    return PLATFORM_CONFIG.filter(p => p.category === 'both');
  }
  return PLATFORM_CONFIG;
}

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  mediaType,
  accounts,
  selectedPlatforms,
  onSelectionChange,
  onPublish,
  publishing,
}) => {
  const availablePlatforms = getAvailablePlatforms(mediaType);

  const handleCheckAll = () => {
    const configuredPlatforms = availablePlatforms
      .filter(p => accounts[p.id]?.enabled)
      .map(p => p.id);
    onSelectionChange(configuredPlatforms);
  };

  const handleUncheckAll = () => {
    onSelectionChange([]);
  };

  return (
    <Card title="选择发布平台" style={{ marginBottom: 16 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button size="small" onClick={handleCheckAll}>全选已配置</Button>
        <Button size="small" onClick={handleUncheckAll}>取消全选</Button>
      </Space>
      <div className="platform-grid">
        {availablePlatforms.map(platform => {
          const account = accounts[platform.id];
          const isConfigured = !!account;
          const isEnabled = account?.enabled;
          const isChecked = selectedPlatforms.includes(platform.id);

          return (
            <Card
              key={platform.id}
              className="platform-card"
              size="small"
              style={{
                opacity: isConfigured && isEnabled ? 1 : 0.6,
                border: isChecked ? '1px solid #1890ff' : undefined,
              }}
            >
              <Space>
                <Checkbox
                  checked={isChecked}
                  disabled={!isConfigured || !isEnabled}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectionChange([...selectedPlatforms, platform.id]);
                    } else {
                      onSelectionChange(selectedPlatforms.filter(p => p !== platform.id));
                    }
                  }}
                />
                <Avatar src={platform.logo} size={24} shape="square" />
                <Typography.Text>{platform.name}</Typography.Text>
                {isConfigured ? (
                  <Tag color={isEnabled ? 'green' : 'default'}>
                    {isEnabled ? '已启用' : '已禁用'}
                  </Tag>
                ) : (
                  <Tag color="orange">未配置</Tag>
                )}
              </Space>
            </Card>
          );
        })}
      </div>
      <Button
        type="primary"
        size="large"
        block
        onClick={onPublish}
        loading={publishing}
        disabled={selectedPlatforms.length === 0}
        style={{ marginTop: 16 }}
      >
        发布到 {selectedPlatforms.length} 个平台
      </Button>
    </Card>
  );
};
