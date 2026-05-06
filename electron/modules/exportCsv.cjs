const path = require("node:path");
const fs = require("node:fs");

function escapeCsv(value) {
  if (value === null || value === undefined) return "";

  const str = String(value);

  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

function registerExportHandlers(ipcMain, app, dialog) {
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
}

module.exports = {
  escapeCsv,
  registerExportHandlers
};