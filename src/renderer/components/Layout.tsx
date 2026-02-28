import React, { useState } from 'react';
import { Layout as AntLayout, Menu, Typography } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  CloudUploadOutlined,
  HistoryOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: '首页' },
  { key: '/publish', icon: <CloudUploadOutlined />, label: '发布' },
  { key: '/history', icon: <HistoryOutlined />, label: '历史' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AntLayout style={{ height: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ background: '#001529' }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
          {!collapsed && (
            <Typography.Text strong style={{ color: 'white', fontSize: 16 }}>
              媒体发布
            </Typography.Text>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <AntLayout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,21,41,.08)' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            多平台媒体发布工具
          </Typography.Title>
        </Header>
        <Content className="content-area">
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};
