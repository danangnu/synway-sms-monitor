import { LinearProgress, Paper, Stack, Typography } from "@mui/material";

type ScanProgressBannerProps = {
  loading: boolean;
  scanCurrent: number;
  scanTotal: number;
  scanProgress: number;
};

export default function ScanProgressBanner({
  loading,
  scanCurrent,
  scanTotal,
  scanProgress
}: ScanProgressBannerProps) {
  if (!loading || scanTotal <= 0) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        bgcolor: "background.paper",
        border: "1px solid rgba(255,255,255,0.06)"
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="body2">
            {scanCurrent > 0
              ? `Scanning port ${scanCurrent} of ${scanTotal}...`
              : "Scanning ports..."}
          </Typography>

          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            {scanCurrent}/{scanTotal} ({scanProgress}%)
          </Typography>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={scanProgress}
          sx={{ height: 8, borderRadius: 999 }}
        />
      </Stack>
    </Paper>
  );
}