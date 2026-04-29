import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";

type SendSmsPanelProps = {
  sendPort: string;
  sendNumber: string;
  sendMessage: string;
  sendEncoding: string;
  sendingSms: boolean;
  loading: boolean;
  onSend: () => void;
  onPortChange: (value: string) => void;
  onNumberChange: (value: string) => void;
  onEncodingChange: (value: string) => void;
  onMessageChange: (value: string) => void;
};

export default function SendSmsPanel({
  sendPort,
  sendNumber,
  sendMessage,
  sendEncoding,
  sendingSms,
  loading,
  onSend,
  onPortChange,
  onNumberChange,
  onEncodingChange,
  onMessageChange
}: SendSmsPanelProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
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
              Send SMS
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.65 }}>
              Send an outbound SMS through the selected Synway port.
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="small"
            onClick={onSend}
            disabled={sendingSms || loading}
          >
            {sendingSms ? "Sending..." : "Send SMS"}
          </Button>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
          <TextField
            size="small"
            label="Port"
            value={sendPort}
            onChange={(e) => onPortChange(e.target.value)}
            sx={{ width: { xs: "100%", md: 120 } }}
            disabled={sendingSms || loading}
          />

          <TextField
            size="small"
            label="Destination Number"
            placeholder="Example: 61400111222"
            value={sendNumber}
            onChange={(e) => onNumberChange(e.target.value)}
            fullWidth
            disabled={sendingSms || loading}
          />

          <TextField
            size="small"
            label="Encoding"
            value={sendEncoding}
            onChange={(e) => onEncodingChange(e.target.value)}
            sx={{ width: { xs: "100%", md: 140 } }}
            helperText="8 = UCS-2"
            disabled={sendingSms || loading}
          />
        </Stack>

        <TextField
          size="small"
          label="Message"
          value={sendMessage}
          onChange={(e) => onMessageChange(e.target.value)}
          multiline
          minRows={3}
          fullWidth
          helperText={`${sendMessage.length} characters`}
          disabled={sendingSms || loading}
        />
      </Stack>
    </Paper>
  );
}