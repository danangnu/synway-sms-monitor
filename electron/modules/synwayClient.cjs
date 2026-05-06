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
}

module.exports = {
  synwayPost,
  registerSynwayHandlers
};