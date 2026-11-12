const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('nexusBrowser', {
  command: (command, value) => ipcRenderer.invoke('browser:command', command, value),
  subscribe: callback => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('browser:state', listener);
    return () => ipcRenderer.removeListener('browser:state', listener);
  },
});
