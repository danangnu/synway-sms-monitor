const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  appInfo: {
    name: "Synway SMS Monitor",
    version: "0.1.0"
  },
  synway: {
    testConnection: (config) => ipcRenderer.invoke("synway:test-connection", config),
    getPortInfo: (config) => ipcRenderer.invoke("synway:get-port-info", config),
    getSmsByPort: (config, port) =>
      ipcRenderer.invoke("synway:get-sms-by-port", config, port)
  }
});