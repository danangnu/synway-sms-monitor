function showDesktopNotification(Notification, title, body) {
  try {
    if (!Notification.isSupported()) {
      console.warn("Desktop notifications are not supported on this system.");
      return { ok: false, supported: false };
    }

    const notification = new Notification({
      title,
      body,
      silent: false
    });

    notification.show();

    return { ok: true, supported: true };
  } catch (error) {
    console.error("Failed to show notification:", error);
    return { ok: false, supported: false };
  }
}

function registerNotificationHandlers(ipcMain, Notification) {
  ipcMain.handle("notify:new-sms", async (_event, payload) => {
    const count = Number(payload.count || 0);
    const deviceHost = payload.deviceHost || "Synway device";

    const title = count === 1 ? "New SMS received" : `${count} new SMS received`;
    const body =
      count === 1
        ? `New message received from ${deviceHost}.`
        : `${count} new messages received from ${deviceHost}.`;

    return showDesktopNotification(Notification, title, body);
  });
}

module.exports = {
  showDesktopNotification,
  registerNotificationHandlers
};