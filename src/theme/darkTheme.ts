import { createTheme } from "@mui/material";

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#081120",
      paper: "#101a2d"
    },
    primary: { main: "#4f8cff" },
    success: { main: "#22c55e" },
    warning: { main: "#f59e0b" },
    error: { main: "#ef4444" },
    info: { main: "#38bdf8" }
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: `"Inter", "Segoe UI", Arial, sans-serif`,
    h5: { fontSize: "1.7rem", fontWeight: 700 },
    h6: { fontSize: "1.1rem", fontWeight: 700 },
    body1: { fontSize: "0.92rem" },
    body2: { fontSize: "0.82rem" },
    caption: { fontSize: "0.72rem" },
    button: { fontSize: "0.8rem", fontWeight: 600, textTransform: "none" }
  }
});