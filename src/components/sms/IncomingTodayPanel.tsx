import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";

export type IncomingTodayRow = {
  id: number;
  device_host: string;
  queried_port: number;
  message_datetime: string;
  synway_datetime: string;
  sender_number: string | null;
  message_text: string;
  port_info: string | null;
  imported_at: string;
};

type IncomingTodayPanelProps = {
  messages: IncomingTodayRow[];
  loading: boolean;
  port: string;
  keyword: string;
  onPortChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onLoad: () => void;
  onDelete?: (item: IncomingTodayRow) => void;
};

export default function IncomingTodayPanel({
  messages,
  loading,
  port,
  keyword,
  onPortChange,
  onKeywordChange,
  onLoad,
  onDelete
}: IncomingTodayPanelProps) {
  return (
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
              Incoming SMS Today
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.65 }}>
              Incoming messages saved in MariaDB for today only.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
            <TextField
              size="small"
              label="Port"
              placeholder="Example: 1"
              value={port}
              onChange={(e) => onPortChange(e.target.value)}
              sx={{ width: { xs: "100%", md: 120 } }}
            />

            <TextField
              size="small"
              label="Search"
              placeholder="sender or message"
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              sx={{ width: { xs: "100%", md: 220 } }}
            />

            <Button
              variant="outlined"
              size="small"
              onClick={onLoad}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load"}
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ overflowX: "auto" }}>
          <Box sx={{ minWidth: 860 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "80px 170px 170px 1fr 170px 90px",
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
              <Box>Imported</Box>
              <Box>Action</Box>
            </Box>

            {messages.length === 0 ? (
              <Box sx={{ px: 2, py: 3 }}>
                <Typography variant="body2" sx={{ opacity: 0.65 }}>
                  No incoming SMS found for today.
                </Typography>
              </Box>
            ) : (
              messages.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "80px 170px 170px 1fr 170px 90px",
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
                      label={`Port ${item.queried_port}`}
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

                  <Typography variant="body2" noWrap>
                    {item.message_datetime}
                  </Typography>

                  <Typography variant="body2" noWrap>
                    {item.sender_number || "-"}
                  </Typography>

                  <Typography variant="body2" noWrap>
                    {item.message_text}
                  </Typography>

                  <Typography variant="body2" noWrap>
                    {item.imported_at}
                  </Typography>
                  <Box>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={() => onDelete?.(item)}
                    >
                      Delete
                    </Button>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}