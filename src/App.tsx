import { useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CssBaseline,
  Divider,
  Drawer,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
  createTheme
} from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import DnsRoundedIcon from "@mui/icons-material/DnsRounded";
import SmsRoundedIcon from "@mui/icons-material/SmsRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CircleRoundedIcon from "@mui/icons-material/CircleRounded";
import RouterRoundedIcon from "@mui/icons-material/RouterRounded";
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

const drawerWidth = 220;

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

function getPortColor(state: DashboardPortCard["state"]) {
  if (state === "active") return "success";
  if (state === "has_sms") return "info";
  return "default";
}

function getPortLabel(state: DashboardPortCard["state"]) {
  if (state === "active") return "Active";
  if (state === "has_sms") return "Has SMS";
  return "Inactive";
}

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

  async function handleConnect() {
    setLoading(true);
    setErrorText("");

    try {
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
    if (!skipLoading) {
      setLoading(true);
    }

    setErrorText("");

    try {
      const portStates = await getPortStates(config);
      const sms = await getAllSms(config, portStates.length);
      const dashboardPorts = buildDashboardPorts(portStates, sms);

      setPorts(dashboardPorts);
      setMessages(sms);

      const latestOverall = [...sms].sort((a, b) =>
        a.dateTime < b.dateTime ? 1 : -1
      )[0];

      setSelectedMessage((prev) => prev ?? latestOverall ?? null);
      setLastSync(new Date().toLocaleString());
      setConnected(true);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Refresh failed");
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
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
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: "border-box",
              bgcolor: "#0d1527",
              borderRight: "1px solid rgba(255,255,255,0.06)"
            }
          }}
        >
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={1.2} alignItems="center">
              <Avatar sx={{ bgcolor: "primary.main", width: 34, height: 34 }}>
                <RouterRoundedIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Box>
                <Typography
                  fontWeight={700}
                  sx={{ fontSize: "0.95rem", lineHeight: 1.1 }}
                >
                  Synway SMS
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.65 }}>
                  Monitor
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

          <List sx={{ px: 1.2, py: 1.5 }}>
            {[
              { text: "Dashboard", icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} /> },
              { text: "Ports", icon: <DnsRoundedIcon sx={{ fontSize: 20 }} /> },
              { text: "Messages", icon: <SmsRoundedIcon sx={{ fontSize: 20 }} /> },
              { text: "Export", icon: <DownloadRoundedIcon sx={{ fontSize: 20 }} /> },
              { text: "Logs", icon: <ArticleRoundedIcon sx={{ fontSize: 20 }} /> },
              { text: "Settings", icon: <SettingsRoundedIcon sx={{ fontSize: 20 }} /> }
            ].map((item) => (
              <ListItemButton
                key={item.text}
                selected={selectedMenu === item.text}
                onClick={() => setSelectedMenu(item.text)}
                sx={{
                  mb: 0.8,
                  py: 0.9,
                  borderRadius: 3,
                  "& .MuiListItemText-primary": {
                    fontSize: "0.92rem"
                  },
                  "&.Mui-selected": {
                    bgcolor: "rgba(79,140,255,0.16)",
                    border: "1px solid rgba(79,140,255,0.25)"
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
                {item.text === "Messages" && totalMessages > 0 && (
                  <Badge badgeContent={totalMessages} color="primary" />
                )}
              </ListItemButton>
            ))}
          </List>

          <Box sx={{ mt: "auto", p: 1.8, opacity: 0.65 }}>
            <Typography variant="body2">Device UI</Typography>
            <Typography variant="caption">Local desktop monitor</Typography>
          </Box>
        </Drawer>

        <Box sx={{ flexGrow: 1, p: 2.2 }}>
          <Stack spacing={2}>
            {errorText && <Alert severity="error">{errorText}</Alert>}

            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: "background.paper",
                border: "1px solid rgba(255,255,255,0.06)"
              }}
            >
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: "column", lg: "row" }}
                  spacing={1.5}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", lg: "center" }}
                >
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircleRoundedIcon
                        sx={{
                          color: connected ? "success.main" : "error.main",
                          fontSize: 12
                        }}
                      />
                      <Typography
                        variant="h5"
                        fontWeight={700}
                        sx={{ fontSize: "1.45rem" }}
                      >
                        {config.baseUrl.replace(/^https?:\/\//, "")}
                      </Typography>
                      <Chip
                        label={connected ? "Online" : "Offline"}
                        color={connected ? "success" : "error"}
                        size="small"
                        sx={{ height: 24 }}
                      />
                    </Stack>
                    <Typography sx={{ opacity: 0.7, mt: 0.5, fontSize: "0.82rem" }}>
                      Last sync: {lastSync}
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      startIcon={<RefreshRoundedIcon />}
                      size="small"
                      onClick={() => handleRefresh()}
                      disabled={loading}
                    >
                      Refresh
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleConnect}
                      disabled={loading}
                    >
                      {loading ? "Loading..." : connected ? "Reconnect" : "Connect"}
                    </Button>
                  </Stack>
                </Stack>

                <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
                  <TextField
                    size="small"
                    label="Device URL"
                    value={config.baseUrl}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, baseUrl: e.target.value }))
                    }
                    fullWidth
                  />
                  <TextField
                    size="small"
                    label="API Username"
                    value={config.username}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, username: e.target.value }))
                    }
                    fullWidth
                  />
                  <TextField
                    size="small"
                    label="API Password"
                    type="password"
                    value={config.password}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, password: e.target.value }))
                    }
                    fullWidth
                  />
                </Stack>
              </Stack>
            </Paper>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
              {[
                { label: "Total Ports", value: totalPorts, color: "primary.main" },
                { label: "Active", value: activePorts, color: "success.main" },
                { label: "Ports With SMS", value: portsWithSms, color: "warning.main" },
                { label: "Total Messages", value: totalMessages, color: "info.main" }
              ].map((card) => (
                <Card
                  key={card.label}
                  sx={{
                    flex: 1,
                    bgcolor: "background.paper",
                    border: "1px solid rgba(255,255,255,0.06)"
                  }}
                >
                  <CardContent sx={{ p: "14px !important" }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        sx={{
                          bgcolor: card.color,
                          color: "#fff",
                          width: 40,
                          height: 40,
                          fontSize: "0.95rem"
                        }}
                      >
                        {card.value}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>
                          {card.label}
                        </Typography>
                        <Typography sx={{ fontSize: "1.55rem", fontWeight: 700 }}>
                          {card.value}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>

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