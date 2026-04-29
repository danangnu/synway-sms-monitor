import { useEffect, useMemo, useRef, useState } from "react";
import { getPortColor, getPortLabel } from "./utils/portHelpers";
import { extractTaskId, mapSynwaySendStatus } from "./utils/smsHelpers";
import AlertStack from "./components/common/AlertStack";
import ScanProgressBanner from "./components/common/ScanProgressBanner";
import Sidebar from "./components/layout/Sidebar";
import ConnectionPanel from "./components/connection/ConnectionPanel";
import SendSmsPanel from "./components/sms/SendSmsPanel";
import StatsCards from "./components/dashboard/StatsCards";
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
  TextField,
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

type SentSmsRow = {
  id: number;
  device_host: string;
  send_port: number;
  destination_number: string;
  message_text: string;
  encoding: string;
  userid: string | null;
  task_id: string | null;
  gateway_result: string | null;
  gateway_content: string | null;
  send_status: string;
  status_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

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
                            gridTemplateColumns: "80px 165px 170px 1fr",
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
                                gridTemplateColumns: "80px 165px 170px 1fr",
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
                            </Box>
                          ))
                        )}
                      </Box>
                    </Box>
                  </Paper>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.8,
                      bgcolor: "background.paper",
                      border: "1px solid rgba(255,255,255,0.06)"
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", md: "center" }}
                        spacing={1.5}
                      >
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            Recent Sent SMS
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.65 }}>
                            Last 100 outbound SMS records saved in MariaDB.
                          </Typography>
                        </Box>

                        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                          <TextField
                            size="small"
                            label="Status"
                            placeholder="success / failed / submitted"
                            value={sentStatusFilter}
                            onChange={(e) => setSentStatusFilter(e.target.value)}
                            sx={{ width: { xs: "100%", md: 190 } }}
                          />

                          <TextField
                            size="small"
                            label="Search"
                            placeholder="number or message"
                            value={sentKeywordFilter}
                            onChange={(e) => setSentKeywordFilter(e.target.value)}
                            sx={{ width: { xs: "100%", md: 220 } }}
                          />

                          <Button
                            variant="outlined"
                            size="small"
                            onClick={loadSentMessages}
                            disabled={sentLoading}
                          >
                            {sentLoading ? "Loading..." : "Load"}
                          </Button>
                        </Stack>
                      </Stack>

                      <Box sx={{ overflowX: "auto" }}>
                        <Box sx={{ minWidth: 960 }}>
                          <Box
                            sx={{
                              display: "grid",
                              gridTemplateColumns: "100px 70px 150px 1fr 140px 160px",
                              px: 1.5,
                              py: 1,
                              borderBottom: "1px solid rgba(255,255,255,0.08)",
                              color: "rgba(255,255,255,0.65)",
                              fontWeight: 600,
                              fontSize: "0.78rem"
                            }}
                          >
                            <Box>Status</Box>
                            <Box>Port</Box>
                            <Box>Destination</Box>
                            <Box>Message</Box>
                            <Box>Task ID</Box>
                            <Box>Created</Box>
                          </Box>

                          {sentMessages.length === 0 ? (
                            <Box sx={{ px: 2, py: 3 }}>
                              <Typography variant="body2" sx={{ opacity: 0.65 }}>
                                No sent SMS history found.
                              </Typography>
                            </Box>
                          ) : (
                            sentMessages.map((item) => (
                              <Box
                                key={item.id}
                                sx={{
                                  display: "grid",
                                  gridTemplateColumns: "100px 70px 150px 1fr 140px 160px",
                                  px: 1.5,
                                  py: 1.2,
                                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                                  "&:hover": {
                                    bgcolor: "rgba(255,255,255,0.04)"
                                  }
                                }}
                              >
                                <Box>
                                  <Chip
                                    label={item.send_status}
                                    size="small"
                                    color={
                                      item.send_status === "success"
                                        ? "success"
                                        : item.send_status === "failed"
                                          ? "error"
                                          : "warning"
                                    }
                                    sx={{
                                      height: 22,
                                      "& .MuiChip-label": {
                                        px: 0.8,
                                        fontSize: "0.72rem"
                                      }
                                    }}
                                  />
                                </Box>

                                <Typography variant="body2">{item.send_port}</Typography>
                                <Typography variant="body2">{item.destination_number}</Typography>
                                <Typography variant="body2" noWrap>
                                  {item.message_text}
                                </Typography>
                                <Typography variant="body2" noWrap>
                                  {item.task_id || "-"}
                                </Typography>
                                <Typography variant="body2" noWrap>
                                  {item.created_at}
                                </Typography>
                              </Box>
                            ))
                          )}
                        </Box>
                      </Box>
                    </Stack>
                  </Paper>
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