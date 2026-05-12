import type { DashboardPortCard } from "../types/synway";

export function getPortColor(connectionStatus: DashboardPortCard["connectionStatus"]) {
  if (connectionStatus === "connect") return "success";
  // if (connectionStatus === "has_sms") return "info";
  return "default";
}

export function getPortLabel(connectionStatus: DashboardPortCard["connectionStatus"]) {
  if (connectionStatus === "connect") return "Connect";
  // if (connectionStatus === "has_sms") return "Has SMS";
  return "Inactive";
}