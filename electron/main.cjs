const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
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

function getSettingsFilePath() {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "synway-settings.json");
}

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

ipcMain.handle("settings:load", async () => {
  try {
    const filePath = getSettingsFilePath();

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Failed to load settings: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

ipcMain.handle("settings:save", async (_event, settings) => {
  try {
    const filePath = getSettingsFilePath();
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), "utf-8");
    return { ok: true, path: filePath };
  } catch (error) {
    throw new Error(
      `Failed to save settings: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

ipcMain.handle("export:messages-csv", async (_event, messages) => {
  try {
    const defaultPath = path.join(
      app.getPath("documents"),
      `synway_messages_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`
    );

    const result = await dialog.showSaveDialog({
      title: "Export SMS messages to CSV",
      defaultPath,
      filters: [{ name: "CSV Files", extensions: ["csv"] }]
    });

    if (result.canceled || !result.filePath) {
      return { ok: false, canceled: true };
    }

    const rows = [
      ["Port", "DateTime", "Sender", "Message"],
      ...messages.map((msg) => [
        msg.queriedPort,
        msg.dateTime,
        msg.number,
        msg.message
      ])
    ];

    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    fs.writeFileSync(result.filePath, csv, "utf-8");

    return { ok: true, path: result.filePath };
  } catch (error) {
    throw new Error(
      `Failed to export CSV: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

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