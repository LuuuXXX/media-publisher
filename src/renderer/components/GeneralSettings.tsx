import React from 'react';
import { Form, Switch, Select, Typography, Divider } from 'antd';

export const GeneralSettings: React.FC = () => {
  return (
    <div>
      <Typography.Title level={5}>通用设置</Typography.Title>
      <Divider />
      <Form layout="vertical">
        <Form.Item label="开机自启动">
          <Switch defaultChecked={false} />
        </Form.Item>
        <Form.Item label="发布后通知">
          <Switch defaultChecked={true} />
        </Form.Item>
        <Form.Item label="语言">
          <Select defaultValue="zh-CN" style={{ width: 200 }}>
            <Select.Option value="zh-CN">简体中文</Select.Option>
            <Select.Option value="en-US">English</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="主题">
          <Select defaultValue="light" style={{ width: 200 }}>
            <Select.Option value="light">浅色</Select.Option>
            <Select.Option value="dark">深色</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </div>
  );
};
