const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const axios = require("axios");
const mysql = require("mysql2/promise");
const crypto = require("node:crypto");

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
    mainWindow.webContents.openDevTools({ mode: "detach" });
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

function getDbConfigFromSettings() {
  const filePath = getSettingsFilePath();

  if (!fs.existsSync(filePath)) {
    throw new Error("Settings file not found. Save settings first.");
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const settings = JSON.parse(raw);

  if (!settings.db) {
    throw new Error("Database settings are missing.");
  }

  return settings.db;
}

async function getDbConnection() {
  const db = getDbConfigFromSettings();

  return mysql.createConnection({
    host: db.host,
    port: db.port || 3306,
    user: db.user,
    password: db.password,
    database: db.database
  });
}

function buildMessageHash(message) {
  const raw = [
    message.device_host || "",
    message.queried_port ?? "",
    message.dateTime || "",
    message.number || "",
    message.message || ""
  ].join("|");

  return crypto.createHash("sha256").update(raw).digest("hex");
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

ipcMain.handle("db:save-messages", async (_event, payload) => {
  let conn;

  try {
    conn = await getDbConnection();

    const deviceHost = payload.deviceHost;
    const messages = payload.messages || [];

    let inserted = 0;
    let skipped = 0;

    for (const msg of messages) {
      const messageHash = buildMessageHash({
        device_host: deviceHost,
        queried_port: msg.queriedPort,
        dateTime: msg.dateTime,
        number: msg.number,
        message: msg.message
      });

      const sql = `
        INSERT INTO sms_messages (
          device_host,
          queried_port,
          message_datetime,
          sender_number,
          message_text,
          port_info,
          message_hash
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          message_hash = message_hash
      `;

      const messageDate =
        msg.dateTime && msg.dateTime.trim() !== ""
          ? msg.dateTime
          : null;

      const [result] = await conn.execute(sql, [
        deviceHost,
        msg.queriedPort,
        messageDate,
        msg.number || null,
        msg.message || "",
        msg.portInfo || null,
        messageHash
      ]);

      if (result.affectedRows === 1) {
        inserted += 1;
      } else {
        skipped += 1;
      }
    }

    return {
      ok: true,
      total: messages.length,
      inserted,
      skipped
    };
  } catch (error) {
    throw new Error(
      `Failed to save messages to database: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  } finally {
    if (conn) {
      await conn.end();
    }
  }
});

ipcMain.handle("db:save-sent-message", async (_event, payload) => {
  let conn;

  try {
    conn = await getDbConnection();

    const messageHash = crypto
      .createHash("sha256")
      .update(
        [
          payload.deviceHost || "",
          payload.port ?? "",
          payload.num || "",
          payload.message || "",
          payload.taskId || "",
          new Date().toISOString()
        ].join("|")
      )
      .digest("hex");

    const sql = `
      INSERT INTO sms_sent_messages (
        device_host,
        send_port,
        destination_number,
        message_text,
        encoding,
        userid,
        task_id,
        gateway_result,
        gateway_content,
        send_status,
        message_hash
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await conn.execute(sql, [
      payload.deviceHost,
      Number(payload.port),
      payload.num,
      payload.message,
      payload.encoding || "8",
      payload.userid || "0",
      payload.taskId || null,
      payload.gatewayResult || null,
      payload.gatewayContent || null,
      payload.sendStatus || "submitted",
      messageHash
    ]);

    return {
      ok: true,
      inserted: result.affectedRows === 1,
      id: result.insertId || null
    };
  } catch (error) {
    throw new Error(
      `Failed to save sent SMS to database: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  } finally {
    if (conn) {
      await conn.end();
    }
  }
});

ipcMain.handle("db:update-sent-message-status", async (_event, payload) => {
  let conn;

  try {
    conn = await getDbConnection();

    const sql = `
      UPDATE sms_sent_messages
      SET
        send_status = ?,
        gateway_result = ?,
        gateway_content = ?,
        status_checked_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const [result] = await conn.execute(sql, [
      payload.sendStatus,
      payload.gatewayResult || null,
      payload.gatewayContent || null,
      payload.id
    ]);

    return {
      ok: true,
      affectedRows: result.affectedRows
    };
  } catch (error) {
    throw new Error(
      `Failed to update sent SMS status: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  } finally {
    if (conn) {
      await conn.end();
    }
  }
});

ipcMain.handle("db:get-sent-messages", async (_event, filters = {}) => {
  let conn;

  try {
    conn = await getDbConnection();

    const where = [];
    const params = [];

    if (filters.port) {
      where.push("send_port = ?");
      params.push(Number(filters.port));
    }

    if (filters.destination) {
      where.push("destination_number LIKE ?");
      params.push(`%${filters.destination}%`);
    }

    if (filters.status) {
      where.push("send_status = ?");
      params.push(filters.status);
    }

    if (filters.keyword) {
      where.push("message_text LIKE ?");
      params.push(`%${filters.keyword}%`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const limit = Number(filters.limit || 100);

    const sql = `
      SELECT
        id,
        device_host,
        send_port,
        destination_number,
        message_text,
        encoding,
        userid,
        task_id,
        gateway_result,
        gateway_content,
        send_status,
        status_checked_at,
        created_at,
        updated_at
      FROM sms_sent_messages
      ${whereSql}
      ORDER BY id DESC
      LIMIT ?
    `;

    const [rows] = await conn.execute(sql, [...params, limit]);

    const normalizedRows = rows.map((row) => ({
      ...row,
      created_at: row.created_at
        ? new Date(row.created_at).toLocaleString()
        : "",
      updated_at: row.updated_at
        ? new Date(row.updated_at).toLocaleString()
        : "",
      status_checked_at: row.status_checked_at
        ? new Date(row.status_checked_at).toLocaleString()
        : null
    }));

    return {
      ok: true,
      rows: normalizedRows
    };
  } catch (error) {
    throw new Error(
      `Failed to load sent SMS history: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  } finally {
    if (conn) {
      await conn.end();
    }
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

ipcMain.handle("synway:send-sms", async (_event, config, payload) => {
  return await synwayPost({
    ...config,
    endpoint: "/API/TaskHandle",
    body: {
      event: "txsms",
      userid: payload.userid || "0",
      num: payload.num,
      port: String(payload.port),
      encoding: payload.encoding || "8",
      smsinfo: payload.message
    }
  });
});

ipcMain.handle("synway:query-sent-sms", async (_event, config, payload) => {
  return await synwayPost({
    ...config,
    endpoint: "/API/QueryInfo",
    body: {
      event: "querytxsms",
      taskid: String(payload.taskId)
    }
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