import React, { useState } from 'react';
import { Card, Form, Input, Typography, message, List, Tag, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { DragZone } from '../components/DragZone';
import { PlatformSelector } from '../components/PlatformSelector';
import { useAccounts } from '../hooks/useAccounts';
import type { MediaFile, PublishResult } from '../types';

export const Publish: React.FC = () => {
  const { accounts } = useAccounts();
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<PublishResult[] | null>(null);
  const [form] = Form.useForm();

  const handlePublish = async () => {
    if (!selectedFile) {
      message.warning('请先选择要发布的文件');
      return;
    }
    if (selectedPlatforms.length === 0) {
      message.warning('请至少选择一个发布平台');
      return;
    }

    try {
      const values = await form.validateFields();
      setPublishing(true);
      setPublishResults(null);

      const result = await window.electronAPI.publish.media({
        filePath: selectedFile.path,
        platforms: selectedPlatforms,
        title: values.title,
        description: values.description || '',
        tags: values.tags ? Array.from(new Set<string>(values.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0))) : [],
      });

      if (result.success && result.data) {
        setPublishResults(result.data);
        const successCount = result.data.filter(r => r.success).length;
        message.success(`发布完成：${successCount}/${result.data.length} 个平台成功`);
      } else {
        message.error(result.error || '发布失败');
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error('发布过程中出现错误');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div>
      <Typography.Title level={4} className="page-title">发布内容</Typography.Title>

      <Card title="1. 选择文件" style={{ marginBottom: 16 }}>
        <DragZone onFileSelected={setSelectedFile} />
      </Card>

      <Card title="2. 填写内容信息" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入内容标题" maxLength={100} showCount />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="请输入内容描述（可选）" rows={3} maxLength={500} showCount />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Input placeholder="多个标签用英文逗号分隔，如: 美食,旅行,生活" />
          </Form.Item>
        </Form>
      </Card>

      <Card title="3. 选择平台" style={{ marginBottom: 16 }}>
        <PlatformSelector
          mediaType={selectedFile?.type || 'unknown'}
          accounts={accounts}
          selectedPlatforms={selectedPlatforms}
          onSelectionChange={setSelectedPlatforms}
          onPublish={handlePublish}
          publishing={publishing}
        />
      </Card>

      {publishResults && (
        <Card title="发布结果">
          <List
            dataSource={publishResults}
            renderItem={(result) => (
              <List.Item>
                <Space>
                  {result.success
                    ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                  <Tag color={result.success ? 'green' : 'red'}>{result.platform}</Tag>
                  {result.success
                    ? <Typography.Text>发布成功</Typography.Text>
                    : <Typography.Text type="danger">{result.error}</Typography.Text>}
                </Space>
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
};
