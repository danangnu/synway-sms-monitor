import { useState } from "react";
import type {
  DashboardPortCard,
  SynwayConfig,
  SynwaySmsMessage
} from "../types/synway";
import {
  buildDashboardPorts,
  getAllSms,
  getPortStates
} from "../services/synwayApi";

export function usePortScan(config: SynwayConfig) {
  const [ports, setPorts] = useState<DashboardPortCard[]>([]);
  const [messages, setMessages] = useState<SynwaySmsMessage[]>([]);
  const [loading, setLoading] = useState(false);

  async function scanPorts() {
    setLoading(true);

    try {
      const states = await getPortStates(config);
      const sms = await getAllSms(config, states.length);
      setPorts(buildDashboardPorts(states, sms));
      setMessages(sms);

      return {
        ports: buildDashboardPorts(states, sms),
        messages: sms
      };
    } finally {
      setLoading(false);
    }
  }

  return {
    ports,
    messages,
    loading,
    scanPorts,
    setPorts,
    setMessages
  };
}