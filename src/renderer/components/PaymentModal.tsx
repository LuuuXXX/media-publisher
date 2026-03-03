import React, { useState, useEffect, useRef } from 'react';
import { Modal, Steps, Button, Space, Typography, Card, Spin, Alert, Input, Form, message as antMessage } from 'antd';
import { AlipayCircleOutlined, WechatOutlined, CheckCircleOutlined } from '@ant-design/icons';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activateLicense: (key: string) => Promise<boolean>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ open, onClose, onSuccess, activateLicense }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [activationKey, setActivationKey] = useState('');
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, []);

  const handleSelectPayment = async (method: string) => {
    setPaymentMethod(method);
    // 开始新轮询前先清理旧的 timeout，避免多个并发轮询
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    setLoading(true);
    try {
      const result = await window.electronAPI.payment.createOrder(method);
      if (result.success && result.data) {
        setOrderId(result.data.orderId);
        setQrCodeUrl(result.data.qrCodeUrl);
        setCurrentStep(1);
        startPolling(result.data.orderId);
      } else {
        // 创建订单失败，重置状态并提示用户
        setPaymentMethod('');
        setOrderId('');
        setQrCodeUrl('');
        antMessage.error('创建支付订单失败，请稍后重试。');
      }
    } catch (error) {
      setPaymentMethod('');
      setOrderId('');
      setQrCodeUrl('');
      console.error('创建支付订单异常:', error);
      antMessage.error('创建支付订单失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (id: string) => {
    const poll = async () => {
      try {
        const result = await window.electronAPI.payment.checkOrder(id);
        if (result.success && result.data?.status === 'paid') {
          if (result.data.licenseKey) {
            // 确认 licenseKey 存在后再停止轮询
            setActivationKey(result.data.licenseKey);
            await activateLicense(result.data.licenseKey);
            setCurrentStep(2);
            onSuccess();
            return; // 不再调度下一次轮询
          }
          // 已支付但 licenseKey 尚未下发，继续轮询等待
        }
      } catch (error) {
        console.error('订单状态查询失败:', error);
        antMessage.error('订单状态查询失败，请稍后重试或手动输入许可证密钥激活。');
        // 返回步骤 0，用户可使用已有许可证密钥手动激活
        setCurrentStep(0);
        return; // 异常时停止轮询
      }
      // 上一轮完成后再调度下一轮，避免并发请求叠加
      pollingRef.current = setTimeout(poll, 3000);
    };
    pollingRef.current = setTimeout(poll, 3000);
  };

  const handleManualActivate = async () => {
    if (!activationKey) return;
    setLoading(true);
    try {
      const success = await activateLicense(activationKey);
      if (success) {
        setCurrentStep(2);
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (pollingRef.current) clearTimeout(pollingRef.current);
    setCurrentStep(0);
    setPaymentMethod('');
    setOrderId('');
    setQrCodeUrl('');
    setActivationKey('');
    onClose();
  };

  const steps = [
    { title: '选择支付方式' },
    { title: '扫码支付' },
    { title: '激活完成' },
  ];

  return (
    <Modal
      title="升级到付费版"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={480}
    >
      <Steps current={currentStep} items={steps} style={{ marginBottom: 24 }} />

      {currentStep === 0 && (
        <div>
          <Typography.Paragraph>
            付费版特性：
          </Typography.Paragraph>
          <ul style={{ marginBottom: 24 }}>
            <li>同时发布到多个平台（无限制）</li>
            <li>每天无限次发布</li>
            <li>支持大文件（无大小限制）</li>
            <li>一次付费，永久使用</li>
          </ul>
          <Typography.Title level={4} style={{ textAlign: 'center', marginBottom: 24 }}>
            ¥99 / 永久
          </Typography.Title>
          <Space style={{ width: '100%', justifyContent: 'center' }} size="large">
            <Button
              size="large"
              icon={<AlipayCircleOutlined style={{ color: '#1677FF' }} />}
              loading={loading && paymentMethod === 'alipay'}
              onClick={() => handleSelectPayment('alipay')}
            >
              支付宝支付
            </Button>
            <Button
              size="large"
              icon={<WechatOutlined style={{ color: '#07C160' }} />}
              loading={loading && paymentMethod === 'wechat'}
              onClick={() => handleSelectPayment('wechat')}
            >
              微信支付
            </Button>
          </Space>
          <div style={{ marginTop: 24 }}>
            <Typography.Text type="secondary">已有许可证密钥？</Typography.Text>
            <Form layout="inline" style={{ marginTop: 8 }}>
              <Form.Item style={{ flex: 1 }}>
                <Input
                  placeholder="输入许可证密钥"
                  value={activationKey}
                  onChange={e => setActivationKey(e.target.value)}
                />
              </Form.Item>
              <Form.Item>
                <Button type="primary" loading={loading} onClick={handleManualActivate}>
                  激活
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <div style={{ textAlign: 'center' }}>
          <Alert
            message="请使用手机扫描二维码完成支付"
            description="支付完成后将自动激活许可证"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Card style={{ display: 'inline-block', padding: 16 }}>
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="扫码支付二维码"
                style={{ width: 200, height: 200, display: 'block' }}
              />
            ) : (
              <Spin tip="等待支付...">
                <div style={{ width: 200, height: 200, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography.Text type="secondary">二维码加载中</Typography.Text>
                </div>
              </Spin>
            )}
          </Card>
          <div style={{ marginTop: 16 }}>
            <Typography.Text type="secondary">订单号: {orderId}</Typography.Text>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div style={{ textAlign: 'center' }}>
          <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
          <Typography.Title level={4}>激活成功！</Typography.Title>
          <Typography.Paragraph>
            感谢您的购买，现在可以享受付费版全部功能。
          </Typography.Paragraph>
          {activationKey && (
            <div>
              <Typography.Text>许可证密钥：</Typography.Text>
              <Typography.Text code copyable>{activationKey}</Typography.Text>
            </div>
          )}
          <Button type="primary" onClick={handleClose} style={{ marginTop: 16 }}>
            开始使用
          </Button>
        </div>
      )}
    </Modal>
  );
};
