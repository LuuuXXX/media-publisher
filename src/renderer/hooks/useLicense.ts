import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import type { LicenseInfo } from '../types';

export function useLicense() {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkLicense = useCallback(async () => {
    setLoading(true);
    try {
      const [infoResult, paidResult] = await Promise.all([
        window.electronAPI.license.getInfo(),
        window.electronAPI.license.isPaid(),
      ]);
      if (infoResult.success) {
        setLicenseInfo(infoResult.data || null);
      }
      if (paidResult.success) {
        setIsPaid(paidResult.paid || false);
      }
    } catch (err) {
      console.error('许可证状态检查失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkLicense();
  }, [checkLicense]);

  const activateLicense = async (key: string) => {
    setLoading(true);
    try {
      const result = await window.electronAPI.license.activate(key);
      if (result.success) {
        message.success('许可证激活成功！');
        await checkLicense();
      } else {
        message.error(result.error || '激活失败');
      }
      return result.success;
    } catch (err) {
      console.error('许可证激活异常:', err);
      message.error('许可证激活失败，请稍后重试');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    licenseInfo,
    isPaid,
    loading,
    checkLicense,
    activateLicense,
  };
}
