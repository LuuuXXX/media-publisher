import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // 账户管理
  account: {
    save: (platform: string, account: { username: string; password: string }) =>
      ipcRenderer.invoke('account:save', platform, account),
    get: (platform: string) =>
      ipcRenderer.invoke('account:get', platform),
    getAll: () =>
      ipcRenderer.invoke('account:getAll'),
    delete: (platform: string) =>
      ipcRenderer.invoke('account:delete', platform),
    toggleEnabled: (platform: string, enabled: boolean) =>
      ipcRenderer.invoke('account:toggleEnabled', platform, enabled),
    export: (password: string) =>
      ipcRenderer.invoke('account:export', password),
    import: (password: string) =>
      ipcRenderer.invoke('account:import', password),
    test: (platform: string) =>
      ipcRenderer.invoke('account:test', platform),
  },

  // 许可证管理
  license: {
    activate: (key: string) =>
      ipcRenderer.invoke('license:activate', key),
    getInfo: () =>
      ipcRenderer.invoke('license:getInfo'),
    verify: () =>
      ipcRenderer.invoke('license:verify'),
    isPaid: () =>
      ipcRenderer.invoke('license:isPaid'),
  },

  // 支付
  payment: {
    createOrder: (method: string) =>
      ipcRenderer.invoke('payment:createOrder', method),
    checkOrder: (orderId: string) =>
      ipcRenderer.invoke('payment:checkOrder', orderId),
  },

  // 发布
  publish: {
    media: (options: {
      filePath: string;
      platforms: string[];
      title: string;
      description: string;
      tags: string[];
    }) => ipcRenderer.invoke('publish:media', options),
    getHistory: () =>
      ipcRenderer.invoke('publish:getHistory'),
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
