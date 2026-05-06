import { Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";

type SmsWatchdogPanelProps = {
  enabled: boolean;
  checking: boolean;
  intervalSeconds: string;
  onIntervalSecondsChange: (value: string) => void;
  onToggle: () => void;
  onCheckNow: () => void;
};

export default function SmsWatchdogPanel({
  enabled,
  checking,
  intervalSeconds,
  onIntervalSecondsChange,
  onToggle,
  onCheckNow
}: SmsWatchdogPanelProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        bgcolor: "background.paper",
        border: "1px solid rgba(255,255,255,0.06)"
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            SMS Watchdog
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.65 }}>
            Automatically checks for new incoming SMS and shows desktop notifications.
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <TextField
            size="small"
            label="Interval seconds"
            value={intervalSeconds}
            onChange={(e) => onIntervalSecondsChange(e.target.value)}
            sx={{ width: { xs: "100%", md: 160 } }}
          />

          <Button
            variant={enabled ? "contained" : "outlined"}
            color={enabled ? "success" : "primary"}
            size="small"
            onClick={onToggle}
          >
            {enabled ? "Watchdog On" : "Start Watchdog"}
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={onCheckNow}
            disabled={checking}
          >
            {checking ? "Checking..." : "Check Now"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}