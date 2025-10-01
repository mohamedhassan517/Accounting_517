import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { spawn } from 'node:child_process';

let serverProcess = null;

async function waitForServer(url, retries = 50, delay = 100) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, delay));
  }
}

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
    show: false,
  });

  win.once('ready-to-show', () => win.show());

  const startUrl = process.env.ELECTRON_START_URL;
  const isDev = !!startUrl || !app.isPackaged;

  if (isDev && startUrl) {
    win.loadURL(startUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const appPath = app.getAppPath();
    const serverEntry = path.join(appPath, 'dist', 'server', 'node-build.mjs');
    try {
      serverProcess = spawn(process.execPath, [serverEntry], {
        env: { ...process.env, PORT: '3000' },
        stdio: 'inherit',
      });
    } catch (e) {
      console.error('Failed to start internal server', e);
    }
    await waitForServer('http://127.0.0.1:3000/health');

    const indexPath = path.join(appPath, 'dist', 'spa', 'index.html');
    win.loadFile(indexPath, {
      search: `apiBase=${encodeURIComponent('http://127.0.0.1:3000')}`,
    });
  }
};

app.whenReady().then(async () => {
  await createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch {}
    serverProcess = null;
  }
});
