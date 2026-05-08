import { useEffect, useRef, useState } from "react";
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

type UseSmsWatchdogOptions = {
  config: SynwayConfig;
  setPorts: React.Dispatch<React.SetStateAction<DashboardPortCard[]>>;
  setMessages: React.Dispatch<React.SetStateAction<SynwaySmsMessage[]>>;
  loadIncomingTodayMessages: () => Promise<void>;
  onConnected: () => void;
  onLastSync: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function useSmsWatchdog({
  config,
  setPorts,
  setMessages,
  loadIncomingTodayMessages,
  onConnected,
  onLastSync,
  onSuccess,
  onError
}: UseSmsWatchdogOptions) {
  const [watchdogEnabled, setWatchdogEnabled] = useState(false);
  const [watchdogIntervalSeconds, setWatchdogIntervalSeconds] = useState("30");
  const [watchdogChecking, setWatchdogChecking] = useState(false);

  const watchdogRunningRef = useRef(false);
  const watchdogBaselineDoneRef = useRef(false);

  async function runSmsWatchdogCheck() {
    if (watchdogRunningRef.current) {
      return;
    }

    watchdogRunningRef.current = true;
    setWatchdogChecking(true);

    try {
      const portStates = await getPortStates(config);

      const sms = await getAllSms(
        config,
        portStates.length,
        undefined,
        () => false
      );

      const dashboardPorts = buildDashboardPorts(portStates, sms);

      setPorts(dashboardPorts);
      setMessages(sms);

      const dbResult = await window.electronAPI.database.saveMessages({
        deviceHost: config.baseUrl.replace(/^https?:\/\//, ""),
        messages: sms.map((msg) => ({
          queriedPort: msg.queriedPort,
          dateTime: msg.dateTime,
          number: msg.number,
          message: msg.message,
          portInfo: msg.portInfo
        }))
      });

      await loadIncomingTodayMessages();

      if (!watchdogBaselineDoneRef.current) {
        watchdogBaselineDoneRef.current = true;

        if (dbResult.inserted > 0) {
          onSuccess(
            `Watchdog baseline loaded ${dbResult.inserted} existing SMS. Notifications will start from the next check.`
          );
        }
      } else if (dbResult.inserted > 0) {
        await window.electronAPI.notification.newSms({
          count: dbResult.inserted,
          deviceHost: config.baseUrl.replace(/^https?:\/\//, "")
        });

        onSuccess(`Watchdog found ${dbResult.inserted} new SMS.`);
      }

      onLastSync();
      onConnected();
    } catch (error) {
      console.error("Watchdog check failed:", error);
      onError(error instanceof Error ? error.message : "Watchdog check failed");
    } finally {
      watchdogRunningRef.current = false;
      setWatchdogChecking(false);
    }
  }

  useEffect(() => {
    if (!watchdogEnabled) {
      return;
    }

    const seconds = Number(watchdogIntervalSeconds || 30);
    const intervalMs = Math.max(seconds, 10) * 1000;

    const timer = window.setInterval(() => {
      runSmsWatchdogCheck();
    }, intervalMs);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    watchdogEnabled,
    watchdogIntervalSeconds,
    config.baseUrl,
    config.username,
    config.password
  ]);

  return {
    watchdogEnabled,
    watchdogChecking,
    watchdogIntervalSeconds,
    setWatchdogEnabled,
    setWatchdogIntervalSeconds,
    runSmsWatchdogCheck
  };
}