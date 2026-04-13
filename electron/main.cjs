const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const axios = require("axios");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 950,
    minWidth: 1200,
    minHeight: 800,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function buildBasicAuth(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

async function synwayPost({ baseUrl, username, password, endpoint, body }) {
  const url = `${baseUrl}${endpoint}`;

  const response = await axios.post(url, body, {
    headers: {
      Authorization: buildBasicAuth(username, password),
      "Content-Type": "application/json"
    },
    timeout: 20000,
    validateStatus: () => true
  });

  if (response.status >= 400) {
    throw new Error(
      `Synway HTTP ${response.status}: ${
        typeof response.data === "string"
          ? response.data
          : JSON.stringify(response.data)
      }`
    );
  }

  return response.data;
}

ipcMain.handle("synway:test-connection", async (_event, config) => {
  return await synwayPost({
    ...config,
    endpoint: "/API/QueryInfo",
    body: { event: "getportinfo" }
  });
});

ipcMain.handle("synway:get-port-info", async (_event, config) => {
  return await synwayPost({
    ...config,
    endpoint: "/API/QueryInfo",
    body: { event: "getportinfo" }
  });
});

ipcMain.handle("synway:get-sms-by-port", async (_event, config, port) => {
  return await synwayPost({
    ...config,
    endpoint: "/API/QueryInfo",
    body: { event: "newqueryrxsms", port: String(port) }
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});