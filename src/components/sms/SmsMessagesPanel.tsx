import {
  Box,
  Button,
  Chip,
  InputBase,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import type { SynwaySmsMessage } from "../../types/synway";

type SmsMessagesPanelProps = {
  search: string;
  messages: SynwaySmsMessage[];
  selectedMessage: SynwaySmsMessage | null;
  selectedPortFilter: number | null;
  onSearchChange: (value: string) => void;
  onSelectMessage: (message: SynwaySmsMessage) => void;
  onExportCsv: () => void;
  onClearPortFilter: () => void;
  onDeleteMessage: (message: SynwaySmsMessage) => void;
};

export default function SmsMessagesPanel({
  search,
  messages,
  selectedMessage,
  selectedPortFilter,
  onSearchChange,
  onSelectMessage,
  onExportCsv,
  onClearPortFilter,
  onDeleteMessage
}: SmsMessagesPanelProps) {
  return (
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
          SMS Messages
        </Typography>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
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
              onChange={(e) => onSearchChange(e.target.value)}
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

          <Button
            variant="outlined"
            startIcon={<DownloadRoundedIcon />}
            size="small"
            onClick={onExportCsv}
            disabled={messages.length === 0}
          >
            Export CSV
          </Button>
        </Stack>
      </Stack>

      {selectedPortFilter !== null && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <Chip
            label={`Filtered by Port ${selectedPortFilter}`}
            color="primary"
            size="small"
          />
          <Button size="small" variant="text" onClick={onClearPortFilter}>
            Clear
          </Button>
        </Stack>
      )}

      <Box sx={{ overflowX: "auto" }}>
        <Box sx={{ minWidth: 810 }}>
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

          {messages.length === 0 ? (
            <Box sx={{ px: 2, py: 3 }}>
              <Typography variant="body2" sx={{ opacity: 0.65 }}>
                {selectedPortFilter !== null
                  ? `No messages found for Port ${selectedPortFilter}.`
                  : "No messages found."}
              </Typography>
            </Box>
          ) : (
            messages.map((msg) => (
              <Box
                key={msg.id}
                onClick={() => onSelectMessage(msg)}
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
                      onDeleteMessage(msg);
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
  );
}