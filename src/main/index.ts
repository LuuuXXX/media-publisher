import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { AccountStore } from './storage/AccountStore';
import { LicenseManager } from './license/LicenseManager';
import { FeatureGuard } from './features/FeatureGuard';
import { MediaPublisher } from './publisher/MediaPublisher';

let mainWindow: BrowserWindow | null = null;
const accountStore = new AccountStore();
const licenseManager = new LicenseManager();
const featureGuard = new FeatureGuard(licenseManager);
const mediaPublisher = new MediaPublisher();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await licenseManager.initialize();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Account management IPC handlers
ipcMain.handle('account:save', async (_event, platform: string, account: { username: string; password: string }) => {
  try {
    await accountStore.saveAccount(platform, account);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('account:get', async (_event, platform: string) => {
  try {
    const account = await accountStore.getAccount(platform);
    return { success: true, data: account };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('account:getAll', async () => {
  try {
    const accounts = await accountStore.getAllAccounts();
    return { success: true, data: accounts };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('account:delete', async (_event, platform: string) => {
  try {
    await accountStore.deleteAccount(platform);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('account:export', async (_event, password: string) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: 'accounts-backup.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (!result.canceled && result.filePath) {
      await accountStore.exportAccounts(result.filePath, password);
      return { success: true };
    }
    return { success: false, error: 'Cancelled' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('account:import', async (_event, password: string) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      await accountStore.importAccounts(result.filePaths[0], password);
      return { success: true };
    }
    return { success: false, error: 'Cancelled' };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('account:test', async (_event, platform: string) => {
  // TODO: Implement actual connection test for each platform
  return { success: true, message: '连接测试成功（模拟）' };
});

// License management IPC handlers
ipcMain.handle('license:activate', async (_event, key: string) => {
  try {
    const result = await licenseManager.activateLicense(key);
    return result;
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('license:getInfo', async () => {
  try {
    const info = await licenseManager.getLicenseInfo();
    return { success: true, data: info };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('license:verify', async () => {
  try {
    const valid = await licenseManager.verifyLicense();
    return { success: true, valid };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('license:isPaid', async () => {
  try {
    const paid = await licenseManager.isPaid();
    return { success: true, paid };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Payment IPC handlers
ipcMain.handle('payment:createOrder', async (_event, method: string) => {
  // TODO: Implement actual payment order creation
  return {
    success: true,
    data: {
      orderId: `ORDER_${Date.now()}`,
      qrCodeUrl: 'https://example.com/qrcode',
      amount: 99,
    },
  };
});

ipcMain.handle('payment:checkOrder', async (_event, orderId: string) => {
  // TODO: Implement actual order status check
  return {
    success: true,
    data: {
      status: 'pending',
      licenseKey: '',
    },
  };
});

// Publisher IPC handlers
ipcMain.handle('publish:media', async (_event, options: {
  filePath: string;
  platforms: string[];
  title: string;
  description: string;
  tags: string[];
}) => {
  try {
    const canPublish = await featureGuard.checkPublishPermission(options.platforms.length);
    if (!canPublish.allowed) {
      return { success: false, error: canPublish.reason };
    }
    const results = await mediaPublisher.publish(options);
    await featureGuard.recordPublish();
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('publish:getHistory', async () => {
  // TODO: Implement publish history from database
  return { success: true, data: [] };
});
