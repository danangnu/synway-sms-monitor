import type { DashboardPortCard } from "../types/synway";

export function getPortColor(state: DashboardPortCard["state"]) {
  if (state === "active") return "success";
  if (state === "has_sms") return "info";
  return "default";
}

export function getPortLabel(state: DashboardPortCard["state"]) {
  if (state === "active") return "Active";
  if (state === "has_sms") return "Has SMS";
  return "Inactive";
}