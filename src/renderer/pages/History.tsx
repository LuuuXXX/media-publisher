import React, { useState, useEffect } from 'react';
import { Table, Tag, Typography, Space, Empty } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { PublishHistory } from '../types';
import type { ColumnsType } from 'antd/es/table';

export const History: React.FC = () => {
  const [history, setHistory] = useState<PublishHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.publish.getHistory();
      if (result.success && result.data) {
        setHistory(result.data);
      }
    } catch (err) {
      console.error('加载发布历史失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<PublishHistory> = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleString(),
      width: 180,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '文件',
      dataIndex: 'filePath',
      key: 'filePath',
      render: (filePath: string) => filePath.split(/[\\/]/).pop() || filePath,
      ellipsis: true,
    },
    {
      title: '平台',
      dataIndex: 'platforms',
      key: 'platforms',
      render: (platforms: string[]) => (
        <Space wrap>
          {platforms.map(p => <Tag key={p}>{p}</Tag>)}
        </Space>
      ),
    },
    {
      title: '结果',
      dataIndex: 'results',
      key: 'results',
      render: (results: PublishHistory['results']) => {
        const success = results.filter(r => r.success).length;
        const total = results.length;
        return (
          <Space>
            {success === total
              ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
              : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            <Typography.Text>{success}/{total} 成功</Typography.Text>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Typography.Title level={4} className="page-title">发布历史</Typography.Title>
      <Table
        columns={columns}
        dataSource={history}
        loading={loading}
        rowKey="id"
        locale={{
          emptyText: <Empty description="暂无发布记录" />,
        }}
      />
    </div>
  );
};
