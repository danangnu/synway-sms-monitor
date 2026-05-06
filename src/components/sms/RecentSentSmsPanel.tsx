import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";

export type SentSmsRow = {
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

type RecentSentSmsPanelProps = {
  messages: SentSmsRow[];
  loading: boolean;
  statusFilter: string;
  keywordFilter: string;
  onStatusFilterChange: (value: string) => void;
  onKeywordFilterChange: (value: string) => void;
  onLoad: () => void;
};

export default function RecentSentSmsPanel({
  messages,
  loading,
  statusFilter,
  keywordFilter,
  onStatusFilterChange,
  onKeywordFilterChange,
  onLoad
}: RecentSentSmsPanelProps) {
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
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              sx={{ width: { xs: "100%", md: 190 } }}
            />

            <TextField
              size="small"
              label="Search"
              placeholder="number or message"
              value={keywordFilter}
              onChange={(e) => onKeywordFilterChange(e.target.value)}
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

            {messages.length === 0 ? (
              <Box sx={{ px: 2, py: 3 }}>
                <Typography variant="body2" sx={{ opacity: 0.65 }}>
                  No sent SMS history found.
                </Typography>
              </Box>
            ) : (
              messages.map((item) => (
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
                  <Typography variant="body2">
                    {item.destination_number}
                  </Typography>
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
  );
}