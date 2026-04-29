import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import CircleRoundedIcon from "@mui/icons-material/CircleRounded";
import type { SynwayConfig } from "../../types/synway";

type ConnectionPanelProps = {
  config: SynwayConfig;
  connected: boolean;
  loading: boolean;
  lastSync: string;
  onSaveSettings: () => void;
  onRefresh: () => void;
  onConnect: () => void;
  onStopRefresh: () => void;
  onBaseUrlChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
};

export default function ConnectionPanel({
  config,
  connected,
  loading,
  lastSync,
  onSaveSettings,
  onRefresh,
  onConnect,
  onStopRefresh,
  onBaseUrlChange,
  onUsernameChange,
  onPasswordChange
}: ConnectionPanelProps) {
  return (
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
              size="small"
              onClick={onSaveSettings}
              disabled={loading}
            >
              Save Settings
            </Button>

            {loading ? (
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={onStopRefresh}
              >
                Stop
              </Button>
            ) : (
              <Button
                variant="outlined"
                startIcon={<RefreshRoundedIcon />}
                size="small"
                onClick={onRefresh}
              >
                Refresh
              </Button>
            )}

            <Button
              variant="contained"
              size="small"
              onClick={onConnect}
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
            onChange={(e) => onBaseUrlChange(e.target.value)}
            fullWidth
          />

          <TextField
            size="small"
            label="API Username"
            value={config.username}
            onChange={(e) => onUsernameChange(e.target.value)}
            fullWidth
          />

          <TextField
            size="small"
            label="API Password"
            type="password"
            value={config.password}
            onChange={(e) => onPasswordChange(e.target.value)}
            fullWidth
          />
        </Stack>
      </Stack>
    </Paper>
  );
}