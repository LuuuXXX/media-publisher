import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import type { AccountInfo } from '../types';

export function useAccounts() {
  const [accounts, setAccounts] = useState<Record<string, AccountInfo>>({});
  const [loading, setLoading] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.account.getAll();
      if (result.success && result.data) {
        setAccounts(result.data);
      }
    } catch (err) {
      console.error('加载账户失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const saveAccount = async (platform: string, username: string, password: string) => {
    try {
      const result = await window.electronAPI.account.save(platform, { username, password });
      if (result.success) {
        message.success('账户保存成功');
        await loadAccounts();
      } else {
        message.error(result.error || '保存失败');
      }
      return result.success;
    } catch (err) {
      console.error('保存账户失败:', err);
      message.error('保存账户失败，请稍后重试');
      return false;
    }
  };

  const toggleAccount = async (platform: string, enabled: boolean) => {
    try {
      const result = await window.electronAPI.account.toggleEnabled(platform, enabled);
      if (result.success) {
        await loadAccounts();
      }
      return result.success;
    } catch (err) {
      console.error('切换账户状态失败:', err);
      message.error('操作失败，请稍后重试');
      return false;
    }
  };

  const deleteAccount = async (platform: string) => {
    try {
      const result = await window.electronAPI.account.delete(platform);
      if (result.success) {
        message.success('账户删除成功');
        await loadAccounts();
      } else {
        message.error(result.error || '删除失败');
      }
      return result.success;
    } catch (err) {
      console.error('删除账户失败:', err);
      message.error('删除账户失败，请稍后重试');
      return false;
    }
  };

  const exportAccounts = async (password: string) => {
    try {
      const result = await window.electronAPI.account.export(password);
      if (result.success) {
        message.success('账户导出成功');
      } else if (result.error !== '已取消') {
        message.error(result.error || '导出失败');
      }
      return result.success;
    } catch (err) {
      console.error('导出账户失败:', err);
      message.error('导出账户失败，请稍后重试');
      return false;
    }
  };

  const importAccounts = async (password: string) => {
    try {
      const result = await window.electronAPI.account.import(password);
      if (result.success) {
        message.success('账户导入成功');
        await loadAccounts();
      } else if (result.error !== '已取消') {
        message.error(result.error || '导入失败');
      }
      return result.success;
    } catch (err) {
      console.error('导入账户失败:', err);
      message.error('导入账户失败，请稍后重试');
      return false;
    }
  };

  const testConnection = async (platform: string) => {
    try {
      const result = await window.electronAPI.account.test(platform);
      if (result.success) {
        message.success(result.message || '连接测试成功');
      } else {
        message.error(result.error || '连接测试失败');
      }
      return result.success;
    } catch (err) {
      console.error('连接测试失败:', err);
      message.error('连接测试失败，请稍后重试');
      return false;
    }
  };

  return {
    accounts,
    loading,
    loadAccounts,
    saveAccount,
    toggleAccount,
    deleteAccount,
    exportAccounts,
    importAccounts,
    testConnection,
  };
}
