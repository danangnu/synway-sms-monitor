import { useEffect, useMemo, useRef, useState } from "react";
import { getPortColor, getPortLabel } from "./utils/portHelpers";
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
import type { IncomingTodayRow } from "./components/sms/IncomingTodayPanel";
import type { SentSmsRow } from "./components/sms/RecentSentSmsPanel";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CssBaseline,
  Divider,
  InputBase,
  Paper,
  Stack,
  ThemeProvider,
  Typography,
  createTheme
} from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import type {
  DashboardPortCard,
  SynwayConfig,
  SynwaySmsMessage
} from "./types/synway";
import {
  buildDashboardPorts,
  getAllSms,
  getPortStates,
  testSynwayConnection
} from "./services/synwayApi";

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

  const [ports, setPorts] = useState<DashboardPortCard[]>([]);
  const [messages, setMessages] = useState<SynwaySmsMessage[]>([]);
  const [selectedMessage, setSelectedMessage] =
    useState<SynwaySmsMessage | null>(null);
  const [selectedPortFilter, setSelectedPortFilter] = useState<number | null>(
    null
  );
  const [lastSync, setLastSync] = useState<string>("-");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanCurrent, setScanCurrent] = useState(0);
  const [scanTotal, setScanTotal] = useState(0);
  const cancelScanRef = useRef(false);
  const sendingSmsRef = useRef(false);
  const [isCanceled, setIsCanceled] = useState(false);
  const [sendPort, setSendPort] = useState("1");
  const [sendNumber, setSendNumber] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [sendEncoding, setSendEncoding] = useState("8");
  const [sendingSms, setSendingSms] = useState(false);
  const [sentMessages, setSentMessages] = useState<SentSmsRow[]>([]);
  const [sentLoading, setSentLoading] = useState(false);
  const [sentStatusFilter, setSentStatusFilter] = useState("");
  const [sentKeywordFilter, setSentKeywordFilter] = useState("");
  const [watchdogEnabled, setWatchdogEnabled] = useState(false);
  const [watchdogIntervalSeconds, setWatchdogIntervalSeconds] = useState("30");
  const watchdogRunningRef = useRef(false);
  const [watchdogChecking, setWatchdogChecking] = useState(false);
  const [incomingTodayMessages, setIncomingTodayMessages] = useState<IncomingTodayRow[]>([]);
  const [incomingTodayLoading, setIncomingTodayLoading] = useState(false);
  const [incomingTodayKeyword, setIncomingTodayKeyword] = useState("");
  const [incomingTodayPort, setIncomingTodayPort] = useState("");
  const watchdogBaselineDoneRef = useRef(false);

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

  useEffect(() => {
    if (!watchdogEnabled) {
      return;
    }

    const seconds = Number(watchdogIntervalSeconds || 30);
    const intervalMs = Math.max(seconds, 10) * 1000;

    const timer = window.setInterval(() => {
      runSmsWatchdogCheck();
    }, intervalMs);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    watchdogEnabled,
    watchdogIntervalSeconds,
    config.baseUrl,
    config.username,
    config.password
  ]);

  function handlePortClick(portNumber: number) {
    const nextPort = selectedPortFilter === portNumber ? null : portNumber;
    setSelectedPortFilter(nextPort);

    if (nextPort === null) {
      const latestOverall = [...messages].sort((a, b) =>
        a.dateTime < b.dateTime ? 1 : -1
      )[0];
      setSelectedMessage(latestOverall ?? null);
      return;
    }

    const portMessages = messages
      .filter((m) => m.queriedPort === nextPort)
      .sort((a, b) => (a.dateTime < b.dateTime ? 1 : -1));

    setSelectedMessage(portMessages[0] ?? null);
  }

  const filteredMessages = useMemo(() => {
    const q = search.toLowerCase().trim();

    return messages.filter((msg) => {
      const matchesSearch =
        !q ||
        msg.number.toLowerCase().includes(q) ||
        msg.message.toLowerCase().includes(q) ||
        String(msg.queriedPort).includes(q);

      const matchesPort =
        selectedPortFilter === null || msg.queriedPort === selectedPortFilter;

      return matchesSearch && matchesPort;
    });
  }, [messages, search, selectedPortFilter]);

  const totalPorts = ports.length;
  const activePorts = ports.filter((p) => p.state === "active").length;
  const portsWithSms = ports.filter((p) => p.smsCount > 0).length;
  const totalMessages = messages.length;

  async function loadSentMessages() {
    if (!window.electronAPI?.database?.getSentMessages) {
      console.warn("Electron database API is not available yet.");
      return;
    }

    setSentLoading(true);

    try {
      const result = await window.electronAPI.database.getSentMessages({
        status: sentStatusFilter.trim() || undefined,
        keyword: sentKeywordFilter.trim() || undefined,
        limit: 100
      });

      if (result.ok) {
        setSentMessages(result.rows);
      }
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : "Failed to load sent SMS history"
      );
    } finally {
      setSentLoading(false);
    }
  }

  async function loadIncomingTodayMessages() {
    if (!window.electronAPI?.database?.getTodayIncomingMessages) {
      console.warn("Incoming today API is not available yet.");
      return;
    }

    setIncomingTodayLoading(true);

    try {
      const result = await window.electronAPI.database.getTodayIncomingMessages({
        port: incomingTodayPort.trim() || undefined,
        keyword: incomingTodayKeyword.trim() || undefined,
        limit: 100
      });

      if (result.ok) {
        setIncomingTodayMessages(result.rows);
      }
    } catch (error) {
      setErrorText(
        error instanceof Error
          ? error.message
          : "Failed to load today's incoming SMS"
      );
    } finally {
      setIncomingTodayLoading(false);
    }
  }

  async function runSmsWatchdogCheck() {
    if (watchdogRunningRef.current) {
      return;
    }

    watchdogRunningRef.current = true;
    setWatchdogChecking(true);

    try {
      const portStates = await getPortStates(config);

      const sms = await getAllSms(
        config,
        portStates.length,
        undefined,
        () => false
      );

      const dashboardPorts = buildDashboardPorts(portStates, sms);

      setPorts(dashboardPorts);
      setMessages(sms);

      const dbResult = await window.electronAPI.database.saveMessages({
        deviceHost: config.baseUrl.replace(/^https?:\/\//, ""),
        messages: sms.map((msg) => ({
          queriedPort: msg.queriedPort,
          dateTime: msg.dateTime,
          number: msg.number,
          message: msg.message,
          portInfo: msg.portInfo
        }))
      });

      await loadIncomingTodayMessages();

      if (!watchdogBaselineDoneRef.current) {
        watchdogBaselineDoneRef.current = true;

        if (dbResult.inserted > 0) {
          setSuccessText(
            `Watchdog baseline loaded ${dbResult.inserted} existing SMS. Notifications will start from the next check.`
          );
        }
      } else if (dbResult.inserted > 0) {
        await window.electronAPI.notification.newSms({
          count: dbResult.inserted,
          deviceHost: config.baseUrl.replace(/^https?:\/\//, "")
        });

        setSuccessText(`Watchdog found ${dbResult.inserted} new SMS.`);
      }

      setLastSync(new Date().toLocaleString());
      setConnected(true);
    } catch (error) {
      console.error("Watchdog check failed:", error);
      setErrorText(
        error instanceof Error ? error.message : "Watchdog check failed"
      );
    } finally {
      watchdogRunningRef.current = false;
      setWatchdogChecking(false);
    }
  }

  async function handleConnect() {
    cancelScanRef.current = false;
    setIsCanceled(false);
    setLoading(true);
    setErrorText("");
    setSuccessText("");

    try {
      await handleSaveSettings();
      await testSynwayConnection(config);
      setConnected(true);
      await handleRefresh(true);
    } catch (error) {
      setConnected(false);
      setErrorText(error instanceof Error ? error.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh(skipLoading = false) {
    cancelScanRef.current = false;
    setIsCanceled(false);

    if (!skipLoading) {
      setLoading(true);
    }

    setErrorText("");
    setSuccessText("");
    setScanProgress(0);
    setScanCurrent(0);
    setScanTotal(0);

    try {
      const portStates = await getPortStates(config);

      setScanTotal(portStates.length);

      const sms = await getAllSms(
        config,
        portStates.length,
        (current, total) => {
          setScanCurrent(current);
          setScanTotal(total);
          setScanProgress(Math.round((current / total) * 100));
        },
        () => cancelScanRef.current
      );

      const dashboardPorts = buildDashboardPorts(portStates, sms);

      setPorts(dashboardPorts);
      setMessages(sms);

      const dbResult = await window.electronAPI.database.saveMessages({
        deviceHost: config.baseUrl.replace(/^https?:\/\//, ""),
        messages: sms.map((msg) => ({
          queriedPort: msg.queriedPort,
          dateTime: msg.dateTime,
          number: msg.number,
          message: msg.message,
          portInfo: msg.portInfo
        }))
      });

      await loadIncomingTodayMessages();

      setSuccessText(
        `Loaded ${sms.length} messages. Saved ${dbResult.inserted} new, skipped ${dbResult.skipped} duplicates.`
      );

      const latestOverall = [...sms].sort((a, b) =>
        a.dateTime < b.dateTime ? 1 : -1
      )[0];

      setSelectedMessage((prev) => prev ?? latestOverall ?? null);
      setLastSync(new Date().toLocaleString());
      setConnected(true);
    } catch (error) {
      if (error instanceof Error && error.message === "SCAN_CANCELED") {
        setIsCanceled(true);
        setSuccessText("Scan canceled.");
      } else {
        setErrorText(error instanceof Error ? error.message : "Refresh failed");
      }
    } finally {
      setScanProgress(0);
      setScanCurrent(0);
      setScanTotal(0);

      if (!skipLoading) {
        setLoading(false);
      }
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

  async function handleDeleteIncomingTodayMessage(item: IncomingTodayRow) {
    const confirmed = window.confirm(
      "Delete this SMS from Synway device and database?"
    );

    if (!confirmed) return;

    try {
      const synwayResult = await window.electronAPI.synway.deleteRxSms(config, {
        port: item.queried_port,
        number: item.sender_number || "",
        dateTime: item.synway_datetime
      });

      if (synwayResult.result !== "ok") {
        throw new Error(
          synwayResult.content || "Failed to delete SMS from Synway device"
        );
      }

      const dbResult = await window.electronAPI.database.deleteIncomingMessage({
        id: item.id
      });

      await loadIncomingTodayMessages();

      setMessages((prev) =>
        prev.filter(
          (msg) =>
            !(
              msg.queriedPort === item.queried_port &&
              msg.number === item.sender_number &&
              msg.message === item.message_text
            )
        )
      );

      if (dbResult.affectedRows > 0) {
        setSuccessText("Incoming SMS deleted from Synway device and database.");
      } else {
        setSuccessText("SMS deleted from Synway device. Database row was not found.");
      }
    } catch (error) {
      setErrorText(
        error instanceof Error
          ? error.message
          : "Failed to delete incoming SMS"
      );
    }
  }

  async function handleDeleteSentMessage(id: number) {
    const confirmed = window.confirm("Delete this sent SMS from database?");

    if (!confirmed) return;

    try {
      const result = await window.electronAPI.database.deleteSentMessage({ id });

      if (result.affectedRows > 0) {
        setSuccessText("Sent SMS deleted.");
        await loadSentMessages();
        return;
      }

      setErrorText("Sent SMS was not found.");
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : "Failed to delete sent SMS"
      );
    }
  }

  async function handleDeleteScannedMessage(msg: SynwaySmsMessage) {
    const confirmed = window.confirm(
      "Delete this SMS from Synway device and database?"
    );

    if (!confirmed) return;

    try {
      const synwayResult = await window.electronAPI.synway.deleteRxSms(config, {
        port: msg.queriedPort,
        number: msg.number,
        dateTime: msg.dateTime
      });

      if (synwayResult.result !== "ok") {
        throw new Error(
          synwayResult.content || "Failed to delete SMS from Synway device"
        );
      }

      const dbResult =
        await window.electronAPI.database.deleteIncomingMessageByFields({
          deviceHost: config.baseUrl.replace(/^https?:\/\//, ""),
          queriedPort: msg.queriedPort,
          dateTime: msg.dateTime,
          number: msg.number,
          message: msg.message
        });

      setMessages((prev) => prev.filter((item) => item.id !== msg.id));

      if (selectedMessage?.id === msg.id) {
        setSelectedMessage(null);
      }

      await loadIncomingTodayMessages();

      if (dbResult.affectedRows > 0) {
        setSuccessText("SMS deleted from Synway device and database.");
      } else {
        setSuccessText(
          "SMS deleted from Synway device. Database record was not found."
        );
      }
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : "Failed to delete SMS"
      );
    }
  }

  function handleStopRefresh() {
    cancelScanRef.current = true;
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

  function clearPortFilter() {
    setSelectedPortFilter(null);

    const latestOverall = [...messages].sort((a, b) =>
      a.dateTime < b.dateTime ? 1 : -1
    )[0];

    setSelectedMessage(latestOverall ?? null);
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
              onRefresh={() => handleRefresh()}
              onConnect={handleConnect}
              onStopRefresh={handleStopRefresh}
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
              portsWithSms={portsWithSms}
              totalMessages={totalMessages}
            />

            <Stack direction={{ xs: "column", xl: "row" }} spacing={2}>
              <Box sx={{ flex: 1.7, minWidth: 0 }}>
                <Stack spacing={2}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.8,
                      bgcolor: "background.paper",
                      border: "1px solid rgba(255,255,255,0.06)"
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={1.5}
                      justifyContent="space-between"
                      alignItems={{ xs: "stretch", md: "center" }}
                      sx={{ mb: 1.5 }}
                    >
                      <Typography variant="h6" fontWeight={700}>
                        Port Monitor
                      </Typography>

                      <Paper
                        sx={{
                          px: 1.2,
                          py: 0.45,
                          display: "flex",
                          alignItems: "center",
                          gap: 0.8,
                          bgcolor: "#0b1323",
                          border: "1px solid rgba(255,255,255,0.06)",
                          width: { xs: "100%", md: 340 }
                        }}
                      >
                        <SearchRoundedIcon sx={{ opacity: 0.6, fontSize: 18 }} />
                        <InputBase
                          placeholder="Search port, message, number..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          sx={{
                            flex: 1,
                            fontSize: "0.84rem",
                            "& input::placeholder": {
                              fontSize: "0.84rem",
                              opacity: 0.7
                            }
                          }}
                        />
                      </Paper>
                    </Stack>

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(135px, 1fr))",
                        gap: 1.2
                      }}
                    >
                      {ports.map((port) => {
                        const isSelected = selectedPortFilter === port.port;

                        return (
                          <Card
                            key={port.port}
                            onClick={() => handlePortClick(port.port)}
                            sx={{
                              bgcolor: isSelected
                                ? "rgba(79,140,255,0.16)"
                                : "#0d1628",
                              border: isSelected
                                ? "1px solid rgba(79,140,255,0.45)"
                                : "1px solid rgba(255,255,255,0.06)",
                              cursor: "pointer",
                              transition: "0.2s ease",
                              boxShadow: isSelected
                                ? "0 0 0 1px rgba(79,140,255,0.18)"
                                : "none",
                              "&:hover": {
                                transform: "translateY(-2px)",
                                borderColor: "rgba(79,140,255,0.28)"
                              }
                            }}
                          >
                            <CardContent sx={{ p: "12px !important" }}>
                              <Stack spacing={0.8}>
                                <Stack
                                  direction="row"
                                  justifyContent="space-between"
                                  alignItems="center"
                                >
                                  <Typography fontWeight={700} sx={{ fontSize: "0.82rem" }}>
                                    Port {port.port}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    label={getPortLabel(port.state)}
                                    color={getPortColor(port.state)}
                                    sx={{
                                      height: 22,
                                      "& .MuiChip-label": {
                                        px: 0.8,
                                        fontSize: "0.72rem"
                                      }
                                    }}
                                  />
                                </Stack>

                                <Typography variant="body2" sx={{ opacity: 0.72 }}>
                                  SMS: {port.smsCount}
                                </Typography>

                                <Typography
                                  variant="caption"
                                  sx={{
                                    opacity: 0.55,
                                    display: "block",
                                    lineHeight: 1.35
                                  }}
                                >
                                  {port.lastTime ? `Last: ${port.lastTime}` : "No activity"}
                                </Typography>

                                <Typography variant="caption" sx={{ opacity: 0.45 }}>
                                  State code: {port.stateCode}
                                </Typography>
                              </Stack>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Box>
                  </Paper>

                  <IncomingTodayPanel
                    messages={incomingTodayMessages}
                    loading={incomingTodayLoading}
                    port={incomingTodayPort}
                    keyword={incomingTodayKeyword}
                    onPortChange={setIncomingTodayPort}
                    onKeywordChange={setIncomingTodayKeyword}
                    onLoad={loadIncomingTodayMessages}
                    onDelete={handleDeleteIncomingTodayMessage}
                  />

                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.8,
                      bgcolor: "background.paper",
                      border: "1px solid rgba(255,255,255,0.06)"
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      justifyContent="space-between"
                      alignItems={{ xs: "flex-start", md: "center" }}
                      spacing={1.5}
                      sx={{ mb: 1.5 }}
                    >
                      <Typography variant="h6" fontWeight={700}>
                        SMS Messages
                      </Typography>

                      <Button
                        variant="outlined"
                        startIcon={<DownloadRoundedIcon />}
                        size="small"
                        onClick={handleExportCsv}
                        disabled={filteredMessages.length === 0}
                      >
                        Export CSV
                      </Button>
                    </Stack>

                    {selectedPortFilter !== null && (
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mb: 1.5 }}
                      >
                        <Chip
                          label={`Filtered by Port ${selectedPortFilter}`}
                          color="primary"
                          size="small"
                        />
                        <Button size="small" variant="text" onClick={clearPortFilter}>
                          Clear
                        </Button>
                      </Stack>
                    )}

                    <Box sx={{ overflowX: "auto" }}>
                      <Box sx={{ minWidth: 720 }}>
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "80px 165px 170px 1fr 90px",
                            px: 1.5,
                            py: 1,
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.65)",
                            fontWeight: 600,
                            fontSize: "0.78rem"
                          }}
                        >
                          <Box>Port</Box>
                          <Box>Date/Time</Box>
                          <Box>Sender</Box>
                          <Box>Message</Box>
                          <Box>Action</Box>
                        </Box>

                        {filteredMessages.length === 0 ? (
                          <Box sx={{ px: 2, py: 3 }}>
                            <Typography variant="body2" sx={{ opacity: 0.65 }}>
                              {selectedPortFilter !== null
                                ? `No messages found for Port ${selectedPortFilter}.`
                                : "No messages found."}
                            </Typography>
                          </Box>
                        ) : (
                          filteredMessages.map((msg) => (
                            <Box
                              key={msg.id}
                              onClick={() => setSelectedMessage(msg)}
                              sx={{
                                display: "grid",
                                gridTemplateColumns: "80px 165px 170px 1fr 90px",
                                px: 1.5,
                                py: 1.2,
                                borderBottom: "1px solid rgba(255,255,255,0.06)",
                                cursor: "pointer",
                                bgcolor:
                                  selectedMessage?.id === msg.id
                                    ? "rgba(79,140,255,0.14)"
                                    : "transparent",
                                "&:hover": {
                                  bgcolor: "rgba(255,255,255,0.04)"
                                }
                              }}
                            >
                              <Box>
                                <Chip
                                  label={`Port ${msg.queriedPort}`}
                                  size="small"
                                  sx={{
                                    height: 22,
                                    "& .MuiChip-label": {
                                      px: 0.8,
                                      fontSize: "0.72rem"
                                    }
                                  }}
                                />
                              </Box>
                              <Typography variant="body2">{msg.dateTime}</Typography>
                              <Typography variant="body2">{msg.number}</Typography>
                              <Typography variant="body2" noWrap>
                                {msg.message}
                              </Typography>
                              <Box>
                                <Button
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteScannedMessage(msg);
                                  }}
                                >
                                  Delete
                                </Button>
                              </Box>
                            </Box>
                          ))
                        )}
                      </Box>
                    </Box>
                  </Paper>

                  <RecentSentSmsPanel
                    messages={sentMessages}
                    loading={sentLoading}
                    statusFilter={sentStatusFilter}
                    keywordFilter={sentKeywordFilter}
                    onStatusFilterChange={setSentStatusFilter}
                    onKeywordFilterChange={setSentKeywordFilter}
                    onLoad={loadSentMessages}
                    onDelete={handleDeleteSentMessage}
                  />
                </Stack>
              </Box>

              <Box sx={{ width: { xs: "100%", xl: 320 } }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.8,
                    bgcolor: "background.paper",
                    border: "1px solid rgba(255,255,255,0.06)",
                    minHeight: 460
                  }}
                >
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
                    Message Details
                  </Typography>

                  {selectedMessage ? (
                    <Stack spacing={1.5}>
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.65 }}>
                          Sender
                        </Typography>
                        <Typography sx={{ fontSize: "1.05rem", fontWeight: 600 }}>
                          {selectedMessage.number}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip
                          label={`Port ${selectedMessage.queriedPort}`}
                          color="primary"
                          size="small"
                        />
                        <Chip
                          label={selectedMessage.dateTime}
                          variant="outlined"
                          size="small"
                        />
                      </Stack>

                      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.65, mb: 0.8 }}>
                          Full Message
                        </Typography>
                        <Paper
                          sx={{
                            p: 1.5,
                            bgcolor: "#0b1323",
                            border: "1px solid rgba(255,255,255,0.06)",
                            minHeight: 140
                          }}
                        >
                          <Typography
                            sx={{
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.6,
                              fontSize: "0.82rem"
                            }}
                          >
                            {selectedMessage.message}
                          </Typography>
                        </Paper>
                      </Box>
                    </Stack>
                  ) : (
                    <Typography sx={{ opacity: 0.6, fontSize: "0.82rem" }}>
                      Select a message to view details.
                    </Typography>
                  )}
                </Paper>
              </Box>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;