import React, { useState } from 'react';
import { Tabs, Typography, Card, Input, Button, Space, Descriptions, Tag } from 'antd';
import { AccountSettings } from '../components/AccountSettings';
import { GeneralSettings } from '../components/GeneralSettings';
import { PaymentModal } from '../components/PaymentModal';
import { useLicense } from '../hooks/useLicense';
import { CrownOutlined } from '@ant-design/icons';

export const Settings: React.FC = () => {
  const { licenseInfo, isPaid, checkLicense, activateLicense } = useLicense();
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);

  const handleActivate = async () => {
    if (!licenseKey) return;
    setActivating(true);
    try {
      await activateLicense(licenseKey);
      setLicenseKey('');
    } finally {
      setActivating(false);
    }
  };

  const tabItems = [
    {
      key: 'accounts',
      label: '账户管理',
      children: <AccountSettings />,
    },
    {
      key: 'general',
      label: '通用设置',
      children: <GeneralSettings />,
    },
    {
      key: 'payment',
      label: '付费管理',
      children: (
        <div>
          <Typography.Title level={5}>许可证状态</Typography.Title>
          {isPaid ? (
            <Card>
              <Descriptions column={1}>
                <Descriptions.Item label="状态">
                  <Tag color="gold" icon={<CrownOutlined />}>付费版</Tag>
                </Descriptions.Item>
                {licenseInfo && (
                  <>
                    <Descriptions.Item label="许可证密钥">{licenseInfo.key}</Descriptions.Item>
                    <Descriptions.Item label="激活时间">{new Date(licenseInfo.activatedAt).toLocaleDateString()}</Descriptions.Item>
                    {licenseInfo.expiresAt && (
                      <Descriptions.Item label="到期时间">{new Date(licenseInfo.expiresAt).toLocaleDateString()}</Descriptions.Item>
                    )}
                  </>
                )}
              </Descriptions>
            </Card>
          ) : (
            <div>
              <Card style={{ marginBottom: 16 }}>
                <Typography.Paragraph>
                  您当前使用的是免费版，升级到付费版可享受：
                </Typography.Paragraph>
                <ul>
                  <li>同时发布到多个平台（无限制）</li>
                  <li>每天无限次发布</li>
                  <li>支持大文件（无大小限制）</li>
                  <li>一次付费，永久使用</li>
                </ul>
                <Button
                  type="primary"
                  icon={<CrownOutlined />}
                  onClick={() => setPaymentModalVisible(true)}
                  style={{ marginTop: 16 }}
                >
                  立即升级 ¥99
                </Button>
              </Card>
              <Card title="已有许可证密钥">
                <Space>
                  <Input
                    placeholder="输入许可证密钥"
                    value={licenseKey}
                    onChange={e => setLicenseKey(e.target.value)}
                    style={{ width: 300 }}
                  />
                  <Button
                    type="primary"
                    loading={activating}
                    onClick={handleActivate}
                    disabled={!licenseKey}
                  >
                    激活
                  </Button>
                </Space>
              </Card>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'about',
      label: '关于',
      children: (
        <Card>
          <Descriptions column={1}>
            <Descriptions.Item label="应用名称">多平台媒体发布工具</Descriptions.Item>
            <Descriptions.Item label="版本">{__APP_VERSION__}</Descriptions.Item>
            <Descriptions.Item label="技术栈">Electron + React + TypeScript + Ant Design</Descriptions.Item>
            <Descriptions.Item label="说明">
              本工具通过模拟浏览器操作实现多平台发布，因大部分平台未提供公开 API，故使用 Puppeteer 实现自动化登录和发布。
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4} className="page-title">设置</Typography.Title>
      <Tabs items={tabItems} />

      <PaymentModal
        open={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        onSuccess={() => {
          setPaymentModalVisible(false);
          checkLicense();
        }}
      />
    </div>
  );
};
