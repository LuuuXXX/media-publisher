import React, { useState } from 'react';
import { Tabs, Button, Space, Modal, Input, Typography, Row, Col } from 'antd';
import { ExportOutlined, ImportOutlined } from '@ant-design/icons';
import { PlatformAccountCard } from './PlatformAccountCard';
import { PLATFORM_CONFIG } from '../types';
import { useAccounts } from '../hooks/useAccounts';

const tabItems = [
  { key: 'all', label: '全部' },
  { key: 'video', label: '视频平台' },
  { key: 'article', label: '文章平台' },
  { key: 'both', label: '图文视频' },
];

export const AccountSettings: React.FC = () => {
  const { accounts, loadAccounts, saveAccount, deleteAccount, exportAccounts, importAccounts, testConnection } = useAccounts();
  const [activeTab, setActiveTab] = useState('all');
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [password, setPassword] = useState('');

  const filteredPlatforms = activeTab === 'all'
    ? PLATFORM_CONFIG
    : PLATFORM_CONFIG.filter(p => p.category === activeTab);

  const handleToggle = async (platform: string, enabled: boolean) => {
    const account = accounts[platform];
    if (account) {
      const fullAccount = await window.electronAPI.account.get(platform);
      if (fullAccount.success && fullAccount.data) {
        await window.electronAPI.account.save(platform, {
          username: fullAccount.data.username,
          password: fullAccount.data.password,
          enabled,
        } as { username: string; password: string });
        await loadAccounts();
      }
    }
  };

  const handleExport = async () => {
    if (!password) return;
    const success = await exportAccounts(password);
    if (success) {
      setExportModalVisible(false);
      setPassword('');
    }
  };

  const handleImport = async () => {
    if (!password) return;
    const success = await importAccounts(password);
    if (success) {
      setImportModalVisible(false);
      setPassword('');
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ExportOutlined />} onClick={() => setExportModalVisible(true)}>
          导出备份
        </Button>
        <Button icon={<ImportOutlined />} onClick={() => setImportModalVisible(true)}>
          导入备份
        </Button>
      </Space>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems.map(tab => ({
          ...tab,
          label: `${tab.label} (${
            (tab.key === 'all' ? PLATFORM_CONFIG : PLATFORM_CONFIG.filter(p => p.category === tab.key))
              .filter(p => accounts[p.id]).length
          }/${tab.key === 'all' ? PLATFORM_CONFIG.length : PLATFORM_CONFIG.filter(p => p.category === tab.key).length})`,
        }))}
      />

      <Row gutter={[16, 16]}>
        {filteredPlatforms.map(platform => (
          <Col key={platform.id} xs={24} sm={12} md={8} lg={6}>
            <PlatformAccountCard
              platform={platform}
              account={accounts[platform.id]}
              onSave={saveAccount}
              onDelete={deleteAccount}
              onTest={testConnection}
              onToggle={handleToggle}
            />
          </Col>
        ))}
      </Row>

      <Modal
        title="导出账户备份"
        open={exportModalVisible}
        onOk={handleExport}
        onCancel={() => { setExportModalVisible(false); setPassword(''); }}
        okText="导出"
        cancelText="取消"
      >
        <Typography.Paragraph>
          请设置备份文件的加密密码，导入时需要此密码。
        </Typography.Paragraph>
        <Input.Password
          placeholder="请输入加密密码"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </Modal>

      <Modal
        title="导入账户备份"
        open={importModalVisible}
        onOk={handleImport}
        onCancel={() => { setImportModalVisible(false); setPassword(''); }}
        okText="导入"
        cancelText="取消"
      >
        <Typography.Paragraph>
          请输入备份文件的加密密码。
        </Typography.Paragraph>
        <Input.Password
          placeholder="请输入加密密码"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </Modal>
    </div>
  );
};
