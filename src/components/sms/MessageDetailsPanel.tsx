import { Box, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import type { SynwaySmsMessage } from "../../types/synway";

type MessageDetailsPanelProps = {
  selectedMessage: SynwaySmsMessage | null;
};

export default function MessageDetailsPanel({
  selectedMessage
}: MessageDetailsPanelProps) {
  return (
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
  );
}