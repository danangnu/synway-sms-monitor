import {
  Box,
  Card,
  CardContent,
  Chip,
  InputBase,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import type { DashboardPortCard } from "../../types/synway";
import { getPortColor, getPortLabel } from "../../utils/portHelpers";

type PortMonitorPanelProps = {
  ports: DashboardPortCard[];
  search: string;
  selectedPortFilter: number | null;
  onSearchChange: (value: string) => void;
  onPortClick: (portNumber: number) => void;
};

export default function PortMonitorPanel({
  ports,
  search,
  selectedPortFilter,
  onSearchChange,
  onPortClick
}: PortMonitorPanelProps) {
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
              onClick={() => onPortClick(port.port)}
              sx={{
                bgcolor: isSelected ? "rgba(79,140,255,0.16)" : "#0d1628",
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
  );
}