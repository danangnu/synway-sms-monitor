const mysql = require("mysql2/promise");
const crypto = require("node:crypto");
const { getDbConfigFromSettings } = require("./settings.cjs");

async function getDbConnection(app) {
  const db = getDbConfigFromSettings(app);

  return mysql.createConnection({
    host: db.host,
    port: db.port || 3306,
    user: db.user,
    password: db.password,
    database: db.database
  });
}

function normalizeSmsValue(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function buildMessageHash(message) {
  const raw = [
    normalizeSmsValue(message.device_host),
    normalizeSmsValue(message.queried_port),
    normalizeSmsValue(message.dateTime),
    normalizeSmsValue(message.number),
    normalizeSmsValue(message.message)
  ].join("|");

  return crypto.createHash("sha256").update(raw).digest("hex");
}

function normalizeDate(value) {
  return value ? new Date(value).toLocaleString() : "";
}

function registerDatabaseHandlers(ipcMain, app) {
  ipcMain.handle("db:save-messages", async (_event, payload) => {
    let conn;

    try {
      conn = await getDbConnection(app);

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
          INSERT IGNORE INTO sms_messages (
            device_host,
            queried_port,
            message_datetime,
            sender_number,
            message_text,
            port_info,
            message_hash
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
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
      conn = await getDbConnection(app);

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
      conn = await getDbConnection(app);

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
      conn = await getDbConnection(app);

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

      return {
        ok: true,
        rows: rows.map((row) => ({
          ...row,
          created_at: normalizeDate(row.created_at),
          updated_at: normalizeDate(row.updated_at),
          status_checked_at: row.status_checked_at
            ? normalizeDate(row.status_checked_at)
            : null
        }))
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

  ipcMain.handle("db:get-today-incoming-messages", async (_event, filters = {}) => {
    let conn;

    try {
      conn = await getDbConnection(app);

      const where = ["DATE(message_datetime) = CURDATE()"];
      const params = [];

      if (filters.port) {
        where.push("queried_port = ?");
        params.push(Number(filters.port));
      }

      if (filters.sender) {
        where.push("sender_number LIKE ?");
        params.push(`%${filters.sender}%`);
      }

      if (filters.keyword) {
        where.push("message_text LIKE ?");
        params.push(`%${filters.keyword}%`);
      }

      const limit = Number(filters.limit || 100);

      const sql = `
        SELECT
          id,
          device_host,
          queried_port,
          message_datetime,
          sender_number,
          message_text,
          port_info,
          imported_at
        FROM sms_messages
        WHERE ${where.join(" AND ")}
        ORDER BY message_datetime DESC, id DESC
        LIMIT ?
      `;

      const [rows] = await conn.execute(sql, [...params, limit]);

      return {
        ok: true,
        rows: rows.map((row) => ({
          ...row,
          message_datetime: normalizeDate(row.message_datetime),
          imported_at: normalizeDate(row.imported_at)
        }))
      };
    } catch (error) {
      throw new Error(
        `Failed to load today's incoming SMS: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      if (conn) {
        await conn.end();
      }
    }
  });
}

module.exports = {
  getDbConnection,
  normalizeSmsValue,
  buildMessageHash,
  registerDatabaseHandlers
};