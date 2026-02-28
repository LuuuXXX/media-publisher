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
      console.error('Failed to check license:', err);
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
