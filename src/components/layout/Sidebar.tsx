import {
  Avatar,
  Badge,
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography
} from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import DnsRoundedIcon from "@mui/icons-material/DnsRounded";
import SmsRoundedIcon from "@mui/icons-material/SmsRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import RouterRoundedIcon from "@mui/icons-material/RouterRounded";

const drawerWidth = 220;

type SidebarProps = {
  selectedMenu: string;
  onSelectMenu: (menu: string) => void;
  totalMessages: number;
};

const menuItems = [
  { text: "Dashboard", icon: <DashboardRoundedIcon sx={{ fontSize: 20 }} /> },
  { text: "Ports", icon: <DnsRoundedIcon sx={{ fontSize: 20 }} /> },
  { text: "Messages", icon: <SmsRoundedIcon sx={{ fontSize: 20 }} /> },
  { text: "Export", icon: <DownloadRoundedIcon sx={{ fontSize: 20 }} /> },
  { text: "Logs", icon: <ArticleRoundedIcon sx={{ fontSize: 20 }} /> },
  { text: "Settings", icon: <SettingsRoundedIcon sx={{ fontSize: 20 }} /> }
];

export default function Sidebar({
  selectedMenu,
  onSelectMenu,
  totalMessages
}: SidebarProps) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: "border-box",
          bgcolor: "#0d1527",
          borderRight: "1px solid rgba(255,255,255,0.06)"
        }
      }}
    >
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Avatar sx={{ bgcolor: "primary.main", width: 34, height: 34 }}>
            <RouterRoundedIcon sx={{ fontSize: 18 }} />
          </Avatar>

          <Box>
            <Typography
              fontWeight={700}
              sx={{ fontSize: "0.95rem", lineHeight: 1.1 }}
            >
              Synway SMS
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.65 }}>
              Monitor
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

      <List sx={{ px: 1.2, py: 1.5 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.text}
            selected={selectedMenu === item.text}
            onClick={() => onSelectMenu(item.text)}
            sx={{
              mb: 0.8,
              py: 0.9,
              borderRadius: 3,
              "& .MuiListItemText-primary": {
                fontSize: "0.92rem"
              },
              "&.Mui-selected": {
                bgcolor: "rgba(79,140,255,0.16)",
                border: "1px solid rgba(79,140,255,0.25)"
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
              {item.icon}
            </ListItemIcon>

            <ListItemText primary={item.text} />

            {item.text === "Messages" && totalMessages > 0 && (
              <Badge badgeContent={totalMessages} color="primary" />
            )}
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ mt: "auto", p: 1.8, opacity: 0.65 }}>
        <Typography variant="body2">Device UI</Typography>
        <Typography variant="caption">Local desktop monitor</Typography>
      </Box>
    </Drawer>
  );
}