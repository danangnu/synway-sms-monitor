const path = require("node:path");
const fs = require("node:fs");

function getSettingsFilePath(app) {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "synway-settings.json");
}

function loadSettings(app) {
  const filePath = getSettingsFilePath(app);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function saveSettings(app, settings) {
  const filePath = getSettingsFilePath(app);
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), "utf-8");

  return {
    ok: true,
    path: filePath
  };
}

function getDbConfigFromSettings(app) {
  const settings = loadSettings(app);

  if (!settings) {
    throw new Error("Settings file not found. Save settings first.");
  }

  if (!settings.db) {
    throw new Error("Database settings are missing.");
  }

  return settings.db;
}

function registerSettingsHandlers(ipcMain, app) {
  ipcMain.handle("settings:load", async () => {
    try {
      return loadSettings(app);
    } catch (error) {
      throw new Error(
        `Failed to load settings: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });

  ipcMain.handle("settings:save", async (_event, settings) => {
    try {
      return saveSettings(app, settings);
    } catch (error) {
      throw new Error(
        `Failed to save settings: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
}

module.exports = {
  getSettingsFilePath,
  loadSettings,
  saveSettings,
  getDbConfigFromSettings,
  registerSettingsHandlers
};