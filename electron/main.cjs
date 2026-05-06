const { app, BrowserWindow, ipcMain, dialog, Notification } = require("electron");
const path = require("node:path");

const { registerSettingsHandlers } = require("./modules/settings.cjs");
const { registerSynwayHandlers } = require("./modules/synwayClient.cjs");
const { registerDatabaseHandlers } = require("./modules/database.cjs");
const { registerExportHandlers } = require("./modules/exportCsv.cjs");
const { registerNotificationHandlers } = require("./modules/notifications.cjs");

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

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error("Renderer failed to load:", {
      errorCode,
      errorDescription,
      validatedURL
    });
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error("Renderer process gone:", details);
  });

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));

    // Remove this before final release if you do not want DevTools.
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

registerSettingsHandlers(ipcMain, app);
registerSynwayHandlers(ipcMain);
registerDatabaseHandlers(ipcMain, app);
registerExportHandlers(ipcMain, app, dialog);
registerNotificationHandlers(ipcMain, Notification);

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