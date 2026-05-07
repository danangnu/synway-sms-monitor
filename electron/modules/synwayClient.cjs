const axios = require("axios");

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

function toSynwayTimestamp(value) {
  const text = String(value || "").trim();

  // Already: 20260413102030
  if (/^\d{14}$/.test(text)) {
    return text;
  }

  // From app: 2026-04-13 10:20:30
  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/
  );

  if (match) {
    return `${match[1]}${match[2]}${match[3]}${match[4]}${match[5]}${match[6]}`;
  }

  throw new Error(`Invalid Synway SMS datetime: ${value}`);
}

function registerSynwayHandlers(ipcMain) {
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

  ipcMain.handle("synway:delete-rx-sms", async (_event, config, payload) => {
    const timestamp = toSynwayTimestamp(payload.dateTime);

    return await synwayPost({
      ...config,
      endpoint: "/API/QueryInfo",
      body: {
        event: "queryrxsms",
        begintime: timestamp,
        endtime: timestamp,
        port: String(payload.port),
        num: payload.number,
        delete: "1"
      }
    });
  });
}

module.exports = {
  synwayPost,
  registerSynwayHandlers,
  toSynwayTimestamp
};