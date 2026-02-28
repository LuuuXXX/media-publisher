import React, { useState } from 'react';
import { Card, Space, Typography, Tag, Switch, Button, Modal, Form, Input, Avatar, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { Platform, AccountInfo } from '../types';

interface PlatformAccountCardProps {
  platform: Platform;
  account?: AccountInfo;
  onSave: (platform: string, username: string, password: string) => Promise<boolean>;
  onDelete: (platform: string) => Promise<boolean>;
  onTest: (platform: string) => Promise<boolean>;
  onToggle: (platform: string, enabled: boolean) => void;
}

export const PlatformAccountCard: React.FC<PlatformAccountCardProps> = ({
  platform,
  account,
  onSave,
  onDelete,
  onTest,
  onToggle,
}) => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [form] = Form.useForm();

  const handleEdit = () => {
    form.setFieldsValue({ username: account?.username || '', password: '' });
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const success = await onSave(platform.id, values.username, values.password);
      if (success) {
        setEditModalVisible(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await onTest(platform.id);
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <Card
        className="platform-card"
        size="small"
        actions={account ? [
          <Button key="test" type="link" size="small" loading={testing} onClick={handleTest} icon={<CheckCircleOutlined />}>测试</Button>,
          <Button key="edit" type="link" size="small" onClick={handleEdit} icon={<EditOutlined />}>编辑</Button>,
          <Popconfirm key="delete" title="确定删除此账户吗？" onConfirm={() => onDelete(platform.id)} okText="删除" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>,
        ] : [
          <Button key="config" type="link" size="small" onClick={handleEdit}>配置账户</Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Avatar src={platform.logo} size={32} shape="square" />
            <div>
              <Typography.Text strong>{platform.name}</Typography.Text>
              {account ? (
                <div>
                  <Tag color="green" style={{ marginTop: 4 }}>已配置</Tag>
                </div>
              ) : (
                <div>
                  <Tag color="default" style={{ marginTop: 4 }}>未配置</Tag>
                </div>
              )}
            </div>
          </Space>
          {account && (
            <Space>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                账号: {account.username}
              </Typography.Text>
              <Switch
                size="small"
                checked={account.enabled}
                onChange={(checked) => onToggle(platform.id, checked)}
              />
            </Space>
          )}
        </Space>
      </Card>

      <Modal
        title={`配置 ${platform.name} 账户`}
        open={editModalVisible}
        onOk={handleSave}
        onCancel={() => setEditModalVisible(false)}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label="账号"
            rules={[{ required: true, message: '请输入账号' }]}
          >
            <Input placeholder="请输入账号/手机号/邮箱" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={platform.loginType !== 'qrcode' ? [{ required: true, message: '请输入密码' }] : []}
          >
            <Input.Password placeholder={platform.loginType === 'qrcode' ? '二维码登录平台可留空' : '请输入密码'} />
          </Form.Item>
        </Form>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          账户信息将使用系统级加密存储在本地，不会上传到服务器。
          {platform.loginType === 'qrcode' && ' 此平台支持二维码登录，实际发布时需要扫码确认。'}
        </Typography.Text>
      </Modal>
    </>
  );
};
