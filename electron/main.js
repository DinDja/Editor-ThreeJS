const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const PORT = 3456;
const DEV_URL = `http://localhost:${PORT}`;

let mainWindow = null;
let serverProcess = null;

function isDev() {
  return !app.isPackaged;
}

function waitForServer(url, retries = 60) {
  return new Promise((resolve, reject) => {
    const attempt = (remaining) => {
      if (remaining <= 0) return reject(new Error('Server did not start in time'));

      http.get(url, (res) => {
        if (res.statusCode === 200) resolve();
        else setTimeout(() => attempt(remaining - 1), 1000);
      }).on('error', () => {
        setTimeout(() => attempt(remaining - 1), 1000);
      });
    };
    attempt(retries);
  });
}

function getProjectDir() {
  if (isDev()) return path.join(__dirname, '..');
  return path.join(process.resourcesPath, 'app');
}

function getNextCliPath() {
  const dir = getProjectDir();
  return path.join(dir, 'node_modules', 'next', 'dist', 'cli', 'next-start');
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    const projectDir = getProjectDir();
    const nextCli = getNextCliPath();

    const args = isDev()
      ? [nextCli, 'dev', '-p', String(PORT)]
      : [nextCli, 'start', '-p', String(PORT)];

    serverProcess = spawn(process.execPath, args, {
      cwd: projectDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      env: { ...process.env, NODE_ENV: isDev() ? 'development' : 'production' },
    });

    serverProcess.stdout.on('data', (data) => {
      process.stdout.write(`[next] ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
      process.stderr.write(`[next:err] ${data}`);
    });

    serverProcess.on('error', reject);
    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.error(`Next.js exited with code ${code}`);
      }
    });

    waitForServer(DEV_URL)
      .then(resolve)
      .catch(reject);
  });
}

function stopServer() {
  if (serverProcess) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
    } else {
      serverProcess.kill('SIGTERM');
    }
    serverProcess = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Editor 3D',
    icon: path.join(getProjectDir(), 'public', 'favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.loadURL(DEV_URL);

  if (isDev()) {
    mainWindow.webContents.openDevTools({ mode: 'bottom' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    console.log('Starting Next.js server...');
    await startNextServer();
    console.log('Next.js server ready. Creating window...');
    createWindow();
  } catch (err) {
    console.error('Failed to start:', err);
    app.quit();
  }
});

app.on('window-all-closed', async () => {
  stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopServer();
});

ipcMain.handle('dialog:openFile', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options?.filters || [
      { name: 'Modelos 3D', extensions: ['glb', 'gltf', 'obj', 'fbx'] },
      { name: 'Todos Arquivos', extensions: ['*'] },
    ],
  });
  return result;
});

ipcMain.handle('dialog:saveFile', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: options?.filters || [
      { name: 'Modelo GLB', extensions: ['glb'] },
      { name: 'Modelo GLTF', extensions: ['gltf'] },
    ],
  });
  return result;
});

ipcMain.handle('getAppInfo', () => ({
  version: app.getVersion(),
  name: app.getName(),
  isDev: isDev(),
  userDataPath: app.getPath('userData'),
}));
