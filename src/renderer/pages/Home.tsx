import React, { useState } from 'react';
import { Card, Col, Row, Statistic, Button, Alert, Typography, Space } from 'antd';
import {
  CloudUploadOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useLicense } from '../hooks/useLicense';
import { useAccounts } from '../hooks/useAccounts';
import { PaymentModal } from '../components/PaymentModal';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isPaid, checkLicense } = useLicense();
  const { accounts } = useAccounts();
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [todayPublished, setTodayPublished] = useState(0);
  const [totalPublished, setTotalPublished] = useState(0);

  const configuredPlatforms = Object.keys(accounts).filter(p => accounts[p].enabled).length;

  return (
    <div>
      <Typography.Title level={4} className="page-title">欢迎使用多平台媒体发布工具</Typography.Title>

      {!isPaid && (
        <Alert
          message="免费版限制"
          description="免费版每次只能发布到1个平台，每天最多发布3次。升级到付费版可解锁全部功能。"
          type="warning"
          showIcon
          action={
            <Button size="small" type="primary" onClick={() => setPaymentModalVisible(true)} icon={<CrownOutlined />}>
              立即升级
            </Button>
          }
          style={{ marginBottom: 24 }}
        />
      )}

      {isPaid && (
        <Alert
          message="付费版"
          description="您已激活付费版，可以享受全部功能。"
          type="success"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="今日发布"
              value={todayPublished}
              prefix={<CloudUploadOutlined />}
              suffix="次"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="累计发布"
              value={totalPublished}
              prefix={<CheckCircleOutlined />}
              suffix="次"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="已配置平台"
              value={configuredPlatforms}
              prefix={<TeamOutlined />}
              suffix="个"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card className="stat-card">
            <Statistic
              title="账户状态"
              value={isPaid ? '付费版' : '免费版'}
              prefix={<CrownOutlined style={{ color: isPaid ? '#faad14' : undefined }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="快速开始" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text>按照以下步骤开始使用：</Typography.Text>
          <ol style={{ paddingLeft: 20, lineHeight: 2 }}>
            <li>在 <Button type="link" style={{ padding: 0 }} onClick={() => navigate('/settings')}>设置</Button> 页面配置您的平台账户</li>
            <li>在 <Button type="link" style={{ padding: 0 }} onClick={() => navigate('/publish')}>发布</Button> 页面上传媒体文件</li>
            <li>选择要发布的平台</li>
            <li>点击发布按钮</li>
          </ol>
        </Space>
      </Card>

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
