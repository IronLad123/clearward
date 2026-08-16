const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let backendProcess = null;
const BACKEND_PORT = 8000;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

function startBackend() {
 return new Promise((resolve, reject) => {
 let executablePath;
 let cwd;
 let args = [];

 if (app.isPackaged) {
 const binaryName = process.platform === 'win32' ? 'clearward-backend.exe' : 'clearward-backend';
 executablePath = path.join(
 process.resourcesPath,
 'dist-backend',
 'clearward-backend',
 binaryName
 );
 cwd = path.dirname(executablePath);
 } else {
 executablePath = 'python3';
 args = [path.join(__dirname, '..', 'backend', 'server.py')];
 cwd = path.join(__dirname, '..');
 }

 console.log(`[Clearward Desktop] Launching backend binary from: ${executablePath}`);

 const env = { ...process.env, PORT: BACKEND_PORT.toString() };
 backendProcess = spawn(executablePath, args, { cwd, env });

 backendProcess.stdout.on('data', (data) => {
 console.log(`[Backend Log] ${data.toString().trim()}`);
 });

 backendProcess.stderr.on('data', (data) => {
 console.error(`[Backend Err] ${data.toString().trim()}`);
 });

 backendProcess.on('error', (err) => {
 console.error('[Clearward Desktop] Failed to start backend process:', err);
 });

 backendProcess.on('exit', (code, signal) => {
 console.log(`[Clearward Desktop] Backend process exited with code ${code}, signal ${signal}`);
 });

 // Poll backend health endpoint until active
 const startTime = Date.now();
 const pollInterval = setInterval(() => {
 http
 .get(`${BACKEND_URL}/api/market-context`, (res) => {
 if (res.statusCode === 200) {
 clearInterval(pollInterval);
 console.log('[Clearward Desktop] Backend server online and responsive.');
 resolve();
 }
 })
 .on('error', () => {
 if (Date.now() - startTime > 30000) {
 clearInterval(pollInterval);
 reject(new Error('Backend server failed to start within 30 seconds.'));
 }
 });
 }, 500);
 });
}

function createWindow() {
 mainWindow = new BrowserWindow({
 width: 1400,
 height: 900,
 minWidth: 1024,
 minHeight: 700,
 title: 'Clearward',
 autoHideMenuBar: true,
 webPreferences: {
 nodeIntegration: false,
 contextIsolation: true,
 webSecurity: false,
 },
 show: false,
 });

 const distIndexPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
 console.log(`[Clearward Desktop] Loading UI from: ${distIndexPath}`);

 mainWindow.loadFile(distIndexPath).catch((err) => {
 console.error('[Clearward Desktop] Failed to load index.html, falling back to HTTP:', err);
 mainWindow.loadURL(BACKEND_URL);
 });

 mainWindow.once('ready-to-show', () => {
 mainWindow.setTitle('Clearward');
 mainWindow.show();
 });

 mainWindow.on('closed', () => {
 mainWindow = null;
 });
}

function stopBackend() {
 if (backendProcess) {
 console.log('[Clearward Desktop] Terminating backend child process cleanly...');
 try {
 backendProcess.kill('SIGTERM');
 setTimeout(() => {
 if (backendProcess && !backendProcess.killed) {
 backendProcess.kill('SIGKILL');
 }
 }, 1000);
 } catch (e) {
 console.error('Error stopping backend:', e);
 }
 backendProcess = null;
 }
}

app.whenReady().then(async () => {
 try {
 await startBackend();
 } catch (err) {
 console.error('[Clearward Desktop] Backend startup error:', err);
 }
 createWindow();

 app.on('activate', () => {
 if (BrowserWindow.getAllWindows().length === 0) {
 createWindow();
 }
 });
});

app.on('window-all-closed', () => {
 stopBackend();
 if (process.platform !== 'darwin') {
 app.quit();
 }
});

app.on('before-quit', () => {
 stopBackend();
});

app.on('will-quit', () => {
 stopBackend();
});
