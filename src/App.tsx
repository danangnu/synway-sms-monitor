import { useEffect, useRef, useState } from "react";
import { extractTaskId, mapSynwaySendStatus } from "./utils/smsHelpers";
import AlertStack from "./components/common/AlertStack";
import ScanProgressBanner from "./components/common/ScanProgressBanner";
import Sidebar from "./components/layout/Sidebar";
import ConnectionPanel from "./components/connection/ConnectionPanel";
import SendSmsPanel from "./components/sms/SendSmsPanel";
import StatsCards from "./components/dashboard/StatsCards";
import SmsWatchdogPanel from "./components/watchdog/SmsWatchdogPanel";
import IncomingTodayPanel from "./components/sms/IncomingTodayPanel";
import RecentSentSmsPanel from "./components/sms/RecentSentSmsPanel";
import SmsMessagesPanel from "./components/sms/SmsMessagesPanel";
import MessageDetailsPanel from "./components/sms/MessageDetailsPanel";
import PortMonitorPanel from "./components/dashboard/PortMonitorPanel";
import { useSentMessages } from "./hooks/useSentMessages";
import { useIncomingTodayMessages } from "./hooks/useIncomingTodayMessages";
import { useSmsScan } from "./hooks/useSmsScan";
import { useSmsWatchdog } from "./hooks/useSmsWatchdog";
import {
  Box,
  CssBaseline,
  Stack,
  ThemeProvider,
  createTheme
} from "@mui/material";
import type { SynwayConfig } from "./types/synway";
import { testSynwayConnection } from "./services/synwayApi";
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#081120",
      paper: "#101a2d"
    },
    primary: {
      main: "#4f8cff"
    },
    success: {
      main: "#22c55e"
    },
    warning: {
      main: "#f59e0b"
    },
    error: {
      main: "#ef4444"
    },
    info: {
      main: "#38bdf8"
    }
  },
  shape: {
    borderRadius: 14
  },
  typography: {
    fontFamily: `"Inter", "Segoe UI", Arial, sans-serif`,
    h5: { fontSize: "1.7rem", fontWeight: 700 },
    h6: { fontSize: "1.1rem", fontWeight: 700 },
    body1: { fontSize: "0.92rem" },
    body2: { fontSize: "0.82rem" },
    caption: { fontSize: "0.72rem" },
    button: { fontSize: "0.8rem", fontWeight: 600, textTransform: "none" }
  }
});

function App() {
  const [selectedMenu, setSelectedMenu] = useState("Dashboard");
  const [search, setSearch] = useState("");

  const [config, setConfig] = useState<SynwayConfig>({
    baseUrl: "http://192.168.18.160",
    username: "ApiUserAdmin",
    password: "Bryan2011"
  });

  const [lastSync, setLastSync] = useState<string>("-");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const sendingSmsRef = useRef(false);
  const [sendPort, setSendPort] = useState("1");
  const [sendNumber, setSendNumber] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sendEncoding, setSendEncoding] = useState("8");
  const [sendingSms, setSendingSms] = useState(false);
  const {
    sentMessages,
    sentLoading,
    sentStatusFilter,
    sentKeywordFilter,
    setSentStatusFilter,
    setSentKeywordFilter,
    loadSentMessages,
    deleteSentMessage
  } = useSentMessages({
    onSuccess: setSuccessText,
    onError: setErrorText
  });
  const {
    incomingTodayMessages,
    incomingTodayLoading,
    incomingTodayKeyword,
    incomingTodayPort,
    setIncomingTodayKeyword,
    setIncomingTodayPort,
    loadIncomingTodayMessages,
    deleteIncomingTodayMessage
  } = useIncomingTodayMessages({
    config,
    onSuccess: setSuccessText,
    onError: setErrorText
  });
  const {
    ports,
    setPorts,
    messages,
    setMessages,
    selectedMessage,
    setSelectedMessage,
    selectedPortFilter,
    scanProgress,
    scanCurrent,
    scanTotal,
    filteredMessages,
    handlePortClick,
    clearPortFilter,
    cancelScan,
    refreshMessages,
    deleteScannedMessage
  } = useSmsScan({
    config,
    search,
    loadIncomingTodayMessages,
    onSuccess: setSuccessText,
    onError: setErrorText
  });
  const {
    watchdogEnabled,
    watchdogChecking,
    watchdogIntervalSeconds,
    setWatchdogEnabled,
    setWatchdogIntervalSeconds,
    runSmsWatchdogCheck
  } = useSmsWatchdog({
    config,
    setPorts,
    setMessages,
    loadIncomingTodayMessages,
    onConnected: () => setConnected(true),
    onLastSync: () => setLastSync(new Date().toLocaleString()),
    onSuccess: setSuccessText,
    onError: setErrorText
  });

  useEffect(() => {
    async function loadSavedSettingsAndHistory() {
      try {
        if (!window.electronAPI?.settings?.load) {
          console.warn("Electron settings API is not available.");
          return;
        }

        const saved = await window.electronAPI.settings.load();

        if (saved) {
          setConfig(saved);
        }

        await loadSentMessages();
        await loadIncomingTodayMessages();
      } catch (error) {
        console.error("Failed to load startup data", error);
        setErrorText(
          error instanceof Error ? error.message : "Failed to load startup data"
        );
      }
    }

    loadSavedSettingsAndHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!errorText && !successText) return;

    const timer = window.setTimeout(() => {
      setErrorText("");
      setSuccessText("");
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [errorText, successText]);

  const totalPorts = ports.length;
  // const activePorts = ports.filter((p) => p.state === "connected").length;
  const activePorts = ports.filter((p) => p.connectionStatus === "connect").length;
  const inactivePorts = ports.filter((p) => p.connectionStatus === "disconnect").length;
  const portsWithSms = ports.filter((p) => p.smsCount > 0).length;
  const totalMessages = messages.length;

  async function handleConnect() {
    setLoading(true);
    setErrorText("");
    setSuccessText("");

    try {
      await handleSaveSettings();
      await testSynwayConnection(config);
      setConnected(true);
      const refreshResult = await refreshMessages(true);

      if (refreshResult.ok) {
        setLastSync(new Date().toLocaleString());
      }
    } catch (error) {
      setConnected(false);
      setErrorText(error instanceof Error ? error.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings() {
    try {
      await window.electronAPI.settings.save(config);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save settings";
      setErrorText(message);
      throw error;
    }
  }

  async function handleExportCsv() {
    try {
      setErrorText("");
      setSuccessText("");

      const result = await window.electronAPI.exportData.messagesCsv(
        filteredMessages.map((msg) => ({
          queriedPort: msg.queriedPort,
          dateTime: msg.dateTime,
          number: msg.number,
          message: msg.message
        }))
      );

      if (result.ok) {
        setSuccessText(`CSV exported successfully to: ${result.path}`);
        return;
      }

      if (!result.canceled) {
        setErrorText("CSV export failed");
      }
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : "Failed to export CSV"
      );
    }
  }

  async function handleSendSms() {
    if (sendingSmsRef.current || sendingSms) {
      return;
    }

    const number = sendNumber.trim();
    const message = sendMessage.trim();
    const port = sendPort.trim();

    if (!number) {
      setErrorText("Destination number is required.");
      return;
    }

    if (!port) {
      setErrorText("Port is required.");
      return;
    }

    if (!message) {
      setErrorText("Message is required.");
      return;
    }

    sendingSmsRef.current = true;
    setSendingSms(true);
    setErrorText("");
    setSuccessText("");

    try {
      const sendResult = await window.electronAPI.synway.sendSms(config, {
        userid: "0",
        num: number,
        port,
        encoding: sendEncoding,
        message
      });

      if (sendResult.result !== "ok") {
        throw new Error(sendResult.content || "Failed to send SMS");
      }

      const taskId = extractTaskId(sendResult.content);

      const dbSaveResult = await window.electronAPI.database.saveSentMessage({
        deviceHost: config.baseUrl.replace(/^https?:\/\//, ""),
        port,
        num: number,
        message,
        encoding: sendEncoding,
        userid: "0",
        taskId,
        gatewayResult: sendResult.result,
        gatewayContent: sendResult.content,
        sendStatus: "submitted"
      });

      let finalStatus = "submitted";
      let queryContent = "";

      if (taskId && dbSaveResult.id) {
        // Small delay gives Synway time to update the task status.
        await new Promise((resolve) => window.setTimeout(resolve, 1500));

        const statusResult = await window.electronAPI.synway.querySentSms(config, {
          taskId
        });

        queryContent = statusResult.content;
        finalStatus = mapSynwaySendStatus(statusResult.result, statusResult.content);

        await window.electronAPI.database.updateSentMessageStatus({
          id: dbSaveResult.id,
          sendStatus: finalStatus,
          gatewayResult: statusResult.result,
          gatewayContent: statusResult.content
        });
      }

      if (finalStatus === "success") {
        setSuccessText(`SMS sent successfully. Task ID: ${taskId || "N/A"}`);
      } else if (finalStatus === "failed") {
        setErrorText(`SMS submitted but failed. ${queryContent || sendResult.content || ""}`);
      } else {
        setSuccessText(
          `SMS submitted and saved to database. Task ID: ${taskId || "N/A"}`
        );
      }

      await loadSentMessages();
      setSendMessage("");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to send SMS");
    } finally {
      sendingSmsRef.current = false;
      setSendingSms(false);
    }
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />

      <Box
        sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}
      >
        <Sidebar
          selectedMenu={selectedMenu}
          onSelectMenu={setSelectedMenu}
          totalMessages={totalMessages}
        />

        <Box sx={{ flexGrow: 1, p: 2.2 }}>
          <Stack spacing={2}>
            <AlertStack errorText={errorText} successText={successText} />

            <ScanProgressBanner
              loading={loading}
              scanCurrent={scanCurrent}
              scanTotal={scanTotal}
              scanProgress={scanProgress}
            />

            <ConnectionPanel
              config={config}
              connected={connected}
              loading={loading}
              lastSync={lastSync}
              onSaveSettings={handleSaveSettings}
              onRefresh={async () => {
                setLoading(true);
                try {
                  const result = await refreshMessages();

                  if (result.ok) {
                    setLastSync(new Date().toLocaleString());
                    setConnected(true);
                  }
                } finally {
                  setLoading(false);
                }
              }}
              onConnect={handleConnect}
              onStopRefresh={cancelScan}
              onBaseUrlChange={(value) =>
                setConfig((prev) => ({ ...prev, baseUrl: value }))
              }
              onUsernameChange={(value) =>
                setConfig((prev) => ({ ...prev, username: value }))
              }
              onPasswordChange={(value) =>
                setConfig((prev) => ({ ...prev, password: value }))
              }
            />

            <SmsWatchdogPanel
              enabled={watchdogEnabled}
              checking={watchdogChecking}
              intervalSeconds={watchdogIntervalSeconds}
              onIntervalSecondsChange={setWatchdogIntervalSeconds}
              onToggle={() => setWatchdogEnabled((prev) => !prev)}
              onCheckNow={runSmsWatchdogCheck}
            />

            <SendSmsPanel
              sendPort={sendPort}
              sendNumber={sendNumber}
              sendMessage={sendMessage}
              sendEncoding={sendEncoding}
              sendingSms={sendingSms}
              loading={loading}
              onSend={handleSendSms}
              onPortChange={setSendPort}
              onNumberChange={setSendNumber}
              onEncodingChange={setSendEncoding}
              onMessageChange={setSendMessage}
            />

            <StatsCards
              totalPorts={totalPorts}
              activePorts={activePorts}
              inactivePorts={inactivePorts}
              portsWithSms={portsWithSms}
              totalMessages={totalMessages}
            />

            <Stack direction={{ xs: "column", xl: "row" }} spacing={2}>
              <Box sx={{ flex: 1.7, minWidth: 0 }}>
                <Stack spacing={2}>
                  <PortMonitorPanel
                    ports={ports}
                    search={search}
                    selectedPortFilter={selectedPortFilter}
                    onSearchChange={setSearch}
                    onPortClick={handlePortClick}
                  />

                  <IncomingTodayPanel
                    messages={incomingTodayMessages}
                    loading={incomingTodayLoading}
                    port={incomingTodayPort}
                    keyword={incomingTodayKeyword}
                    onPortChange={setIncomingTodayPort}
                    onKeywordChange={setIncomingTodayKeyword}
                    onLoad={loadIncomingTodayMessages}
                    onDelete={deleteIncomingTodayMessage}
                  />

                  <SmsMessagesPanel
                    search={search}
                    messages={filteredMessages}
                    selectedMessage={selectedMessage}
                    selectedPortFilter={selectedPortFilter}
                    onSearchChange={setSearch}
                    onSelectMessage={setSelectedMessage}
                    onExportCsv={handleExportCsv}
                    onClearPortFilter={clearPortFilter}
                    onDeleteMessage={deleteScannedMessage}
                  />

                  <RecentSentSmsPanel
                    messages={sentMessages}
                    loading={sentLoading}
                    statusFilter={sentStatusFilter}
                    keywordFilter={sentKeywordFilter}
                    onStatusFilterChange={setSentStatusFilter}
                    onKeywordFilterChange={setSentKeywordFilter}
                    onLoad={loadSentMessages}
                    onDelete={deleteSentMessage}
                  />
                </Stack>
              </Box>

              <Box sx={{ width: { xs: "100%", xl: 320 } }}>
                <MessageDetailsPanel selectedMessage={selectedMessage} />
              </Box>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;