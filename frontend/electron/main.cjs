const { app, BrowserWindow, WebContentsView, ipcMain, session } = require('electron');
const { join } = require('node:path');
const { rmSync } = require('node:fs');
const { createServer } = require('node:http');
const shellURL = 'http://127.0.0.1:48000';
// Dedicated profile folder so "fresh start" only ever wipes Nexus data (cookies, cache, saved theme/chat).
app.setPath('userData', join(app.getPath('appData'), 'Nexus'));
if (process.argv.includes('--fresh')) { rmSync(app.getPath('userData'), { recursive: true, force: true }); console.info('[nexus] Fresh start: previous browser profile cleared.'); }
// A random high port avoids clashes with other Chromium browsers (a fixed 9233 was already held by Edge on this machine).
const cdpPort = 40000 + Math.floor(Math.random() * 20000);
app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1');
app.commandLine.appendSwitch('remote-debugging-port', String(cdpPort));
let window, bridge, activeId, bounds;
const tabs = new Map();
const TITLEBAR_HEIGHT = 44;
const overlayThemes = { light: { color: '#e9edf4', symbolColor: '#334155' }, dark: { color: '#12161d', symbolColor: '#cbd5e1' } };
const live = t => !t.view.webContents.isDestroyed();
const state = () => ({ activeId, tabs: [...tabs.values()].filter(live).map(t => ({ id: t.id, url: t.view.webContents.getURL(), title: t.view.webContents.getTitle() || 'New tab', loading: t.view.webContents.isLoading(), error: t.error, canGoBack: t.view.webContents.navigationHistory.canGoBack(), canGoForward: t.view.webContents.navigationHistory.canGoForward() })) });
function publish() { layout(); if (window && !window.isDestroyed()) window.webContents.send('browser:state', state()); }
function layout() { for (const tab of tabs.values()) { if (!live(tab)) continue; tab.view.setVisible(tab.id === activeId && !!bounds && tab.view.webContents.getURL() !== "about:blank" && !!tab.view.webContents.getURL() && !tab.error); if (bounds) tab.view.setBounds(bounds); } }
function safeURL(input) { if (typeof input !== 'string' || input.length > 4096) throw new Error('Invalid address.'); if (input === 'about:blank') return input; const url = new URL(input); if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only web URLs are supported.'); return url.href; }
async function createTab(url = 'about:blank') {
  url = safeURL(url);
  const view = new WebContentsView({ webPreferences: { partition: 'persist:nexus-web', sandbox: true, contextIsolation: true, nodeIntegration: false } });
  const wc = view.webContents;
  const tab = { id: String(wc.id), view, error: '', targetId: null };
  tabs.set(tab.id, tab); window.contentView.addChildView(view); activeId = tab.id;
  wc.debugger.attach('1.3');
  try { tab.targetId = (await wc.debugger.sendCommand('Target.getTargetInfo')).targetInfo.targetId; } finally { wc.debugger.detach(); }
  for (const event of ['page-title-updated', 'did-navigate', 'did-navigate-in-page', 'did-start-loading', 'did-stop-loading']) wc.on(event, publish);
  wc.on('did-start-navigation', details => { if (details.isMainFrame && !details.isSameDocument) tab.error = ''; });
  wc.on('did-fail-load', (_e, code, description, failedURL, main) => { if (main && code !== -3) { tab.error = description || 'The page could not be loaded.'; publish(); } });
  for (const event of ['will-navigate', 'will-redirect']) wc.on(event, (e, target) => { try { safeURL(target); } catch { e.preventDefault(); } });
  wc.setWindowOpenHandler(({ url }) => { void createTab(url).catch(console.error); return { action: 'deny' }; });
  layout(); publish();
  void wc.loadURL(url).catch(error => { if (error?.code !== 'ERR_ABORTED') { tab.error = error.message; publish(); } });
  return state();
}
function trusted(event) { if (event.sender !== window?.webContents || event.senderFrame !== window.webContents.mainFrame || new URL(event.senderFrame.url).origin !== shellURL) throw new Error('Untrusted caller'); }
ipcMain.handle('browser:command', async (event, command, value) => {
  trusted(event); if (typeof command !== 'string') throw new Error('Unknown browser command');
  const tab = tabs.get(activeId);
  switch (command) {
    case 'state': return state();
    case 'new': return createTab(typeof value === 'string' && value ? value : 'about:blank');
    case 'select': if (typeof value !== 'string' || !tabs.has(value)) throw new Error('Tab not found'); activeId = value; break;
    case 'close': {
      if (typeof value !== 'string') throw new Error('Tab not found');
      const closing = tabs.get(value);
      if (closing) { tabs.delete(value); window.contentView.removeChildView(closing.view); if (live(closing)) closing.view.webContents.close(); }
      if (!tabs.size) return createTab();
      if (activeId === value || !tabs.has(activeId)) activeId = [...tabs.keys()].at(-1); break;
    }
    case 'navigate': if (tab) { const target = safeURL(value); void tab.view.webContents.loadURL(target).catch(error => { if (error?.code !== 'ERR_ABORTED') { tab.error = error.message; publish(); } }); } break;
    case 'back': if (tab?.view.webContents.navigationHistory.canGoBack()) tab.view.webContents.navigationHistory.goBack(); break;
    case 'forward': if (tab?.view.webContents.navigationHistory.canGoForward()) tab.view.webContents.navigationHistory.goForward(); break;
    case 'reload': if (tab) { tab.error = ''; if (tab.view.webContents.getURL()) tab.view.webContents.reload(); } break;
    case 'theme': {
      const theme = overlayThemes[value];
      if (!theme) throw new Error('Unknown theme');
      try { window.setTitleBarOverlay({ ...theme, height: TITLEBAR_HEIGHT }); window.setBackgroundColor(theme.color); } catch { /* overlay unsupported on this platform */ }
      return state();
    }
    case 'bounds': {
      if (!value || !['x','y','width','height'].every(k => Number.isFinite(value[k]) && value[k] >= 0)) throw new Error('Invalid bounds');
      const [width, height] = window.getContentSize();
      const x = Math.min(Math.round(value.x), width), y = Math.min(Math.round(value.y), height);
      bounds = { x, y, width: Math.max(0, Math.min(Math.round(value.width), width-x)), height: Math.max(0, Math.min(Math.round(value.height), height-y)) }; break;
    }
    default: throw new Error('Unknown browser command');
  }
  layout(); publish(); return state();
});
async function verifyCdp() {
  const tab = tabs.get(activeId);
  try {
    const list = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`, { signal: AbortSignal.timeout(3000) })).json();
    if (!list.some(t => t.id === tab?.targetId)) throw new Error('debugging port does not expose the Nexus tab');
    console.info(`[nexus] CDP ready on 127.0.0.1:${cdpPort}`);
  } catch (error) { console.error(`[nexus] CDP check failed on 127.0.0.1:${cdpPort}: ${error.message}`); }
}
app.whenReady().then(async () => {
  const webSession = session.fromPartition('persist:nexus-web');
  webSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  webSession.setPermissionCheckHandler(() => false);
  bridge = createServer((req, res) => {
    if (req.method !== 'GET' || req.url !== '/active' || req.headers.origin) { res.writeHead(403).end(); return; }
    const tab = tabs.get(activeId);
    res.writeHead(tab?.targetId ? 200 : 503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(tab?.targetId ? { targetId: tab.targetId, tabId: tab.id, cdpPort } : { error: 'No active webpage tab' }));
  });
  await new Promise((resolve, reject) => { bridge.once('error', reject); bridge.listen(9234, '127.0.0.1', resolve); });
  window = new BrowserWindow({ width: 1440, height: 900, minWidth: 1000, minHeight: 680, backgroundColor: overlayThemes.light.color, title: 'Nexus', autoHideMenuBar: true, titleBarStyle: 'hidden', titleBarOverlay: { ...overlayThemes.light, height: TITLEBAR_HEIGHT }, webPreferences: { preload: join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  window.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== shellURL) event.preventDefault(); });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.on('closed', () => { for (const tab of tabs.values()) if (live(tab)) tab.view.webContents.close(); tabs.clear(); app.quit(); });
  await window.loadURL(shellURL); await createTab(); await verifyCdp();
}).catch(error => { console.error('Nexus startup failed:', error); app.quit(); });
app.on('before-quit', () => bridge?.close());
app.on('window-all-closed', () => app.quit());
