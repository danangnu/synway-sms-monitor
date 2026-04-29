import { Avatar, Card, CardContent, Stack, Typography, Box } from "@mui/material";

type StatsCardsProps = {
  totalPorts: number;
  activePorts: number;
  portsWithSms: number;
  totalMessages: number;
};

const cards = [
  { key: "totalPorts", label: "Total Ports", color: "primary.main" },
  { key: "activePorts", label: "Active", color: "success.main" },
  { key: "portsWithSms", label: "Ports With SMS", color: "warning.main" },
  { key: "totalMessages", label: "Total Messages", color: "info.main" }
] as const;

export default function StatsCards({
  totalPorts,
  activePorts,
  portsWithSms,
  totalMessages
}: StatsCardsProps) {
  const values = {
    totalPorts,
    activePorts,
    portsWithSms,
    totalMessages
  };

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
      {cards.map((card) => (
        <Card
          key={card.key}
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
                {values[card.key]}
              </Avatar>

              <Box>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  {card.label}
                </Typography>
                <Typography sx={{ fontSize: "1.55rem", fontWeight: 700 }}>
                  {values[card.key]}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
``