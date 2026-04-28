const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  appInfo: {
    name: "Synway SMS Monitor",
    version: "0.1.0"
  },
  settings: {
    load: () => ipcRenderer.invoke("settings:load"),
    save: (settings) => ipcRenderer.invoke("settings:save", settings)
  },
  exportData: {
    messagesCsv: (messages) => ipcRenderer.invoke("export:messages-csv", messages)
  },
  synway: {
    testConnection: (config) => ipcRenderer.invoke("synway:test-connection", config),
    getPortInfo: (config) => ipcRenderer.invoke("synway:get-port-info", config),
    getSmsByPort: (config, port) =>
      ipcRenderer.invoke("synway:get-sms-by-port", config, port),
    sendSms: (config, payload) =>
      ipcRenderer.invoke("synway:send-sms", config, payload),
    querySentSms: (config, payload) =>
      ipcRenderer.invoke("synway:query-sent-sms", config, payload)
  },
  database: {
    saveMessages: (payload) => ipcRenderer.invoke("db:save-messages", payload),
    saveSentMessage: (payload) => ipcRenderer.invoke("db:save-sent-message", payload),
    updateSentMessageStatus: (payload) =>
      ipcRenderer.invoke("db:update-sent-message-status", payload),
    getSentMessages: (filters) => ipcRenderer.invoke("db:get-sent-messages", filters)
  }
});