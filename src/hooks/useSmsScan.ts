import { useMemo, useRef, useState } from "react";
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

type UseSmsScanOptions = {
  config: SynwayConfig;
  search: string;
  loadIncomingTodayMessages: () => Promise<void>;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function useSmsScan({
  config,
  search,
  loadIncomingTodayMessages,
  onSuccess,
  onError
}: UseSmsScanOptions) {
  const [ports, setPorts] = useState<DashboardPortCard[]>([]);
  const [messages, setMessages] = useState<SynwaySmsMessage[]>([]);
  const [selectedMessage, setSelectedMessage] =
    useState<SynwaySmsMessage | null>(null);
  const [selectedPortFilter, setSelectedPortFilter] = useState<number | null>(
    null
  );

  const [scanProgress, setScanProgress] = useState(0);
  const [scanCurrent, setScanCurrent] = useState(0);
  const [scanTotal, setScanTotal] = useState(0);

  const cancelScanRef = useRef(false);

  const filteredMessages = useMemo(() => {
    const q = search.toLowerCase().trim();

    return messages.filter((msg) => {
      const matchesSearch =
        !q ||
        msg.number.toLowerCase().includes(q) ||
        msg.message.toLowerCase().includes(q) ||
        String(msg.queriedPort).includes(q);

      const matchesPort =
        selectedPortFilter === null || msg.queriedPort === selectedPortFilter;

      return matchesSearch && matchesPort;
    });
  }, [messages, search, selectedPortFilter]);

  function handlePortClick(portNumber: number) {
    const nextPort = selectedPortFilter === portNumber ? null : portNumber;
    setSelectedPortFilter(nextPort);

    if (nextPort === null) {
      const latestOverall = [...messages].sort((a, b) =>
        a.dateTime < b.dateTime ? 1 : -1
      )[0];

      setSelectedMessage(latestOverall ?? null);
      return;
    }

    const portMessages = messages
      .filter((m) => m.queriedPort === nextPort)
      .sort((a, b) => (a.dateTime < b.dateTime ? 1 : -1));

    setSelectedMessage(portMessages[0] ?? null);
  }

  function clearPortFilter() {
    setSelectedPortFilter(null);

    const latestOverall = [...messages].sort((a, b) =>
      a.dateTime < b.dateTime ? 1 : -1
    )[0];

    setSelectedMessage(latestOverall ?? null);
  }

  function cancelScan() {
    cancelScanRef.current = true;
  }

  async function refreshMessages(skipLoading: boolean = false) {
    cancelScanRef.current = false;

    onError("");
    onSuccess("");

    setScanProgress(0);
    setScanCurrent(0);
    setScanTotal(0);

    try {
      const portStates = await getPortStates(config);

      setScanTotal(portStates.length);

      const sms = await getAllSms(
        config,
        portStates.length,
        (current, total) => {
          setScanCurrent(current);
          setScanTotal(total);
          setScanProgress(Math.round((current / total) * 100));
        },
        () => cancelScanRef.current
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

      onSuccess(
        `Loaded ${sms.length} messages. Saved ${dbResult.inserted} new, skipped ${dbResult.skipped} duplicates.`
      );

      const latestOverall = [...sms].sort((a, b) =>
        a.dateTime < b.dateTime ? 1 : -1
      )[0];

      setSelectedMessage((prev) => prev ?? latestOverall ?? null);

      return {
        ok: true,
        canceled: false
      };
    } catch (error) {
      if (error instanceof Error && error.message === "SCAN_CANCELED") {
        onSuccess("Scan canceled.");

        return {
          ok: false,
          canceled: true
        };
      }

      onError(error instanceof Error ? error.message : "Refresh failed");

      return {
        ok: false,
        canceled: false
      };
    } finally {
      setScanProgress(0);
      setScanCurrent(0);
      setScanTotal(0);

      void skipLoading;
    }
  }

  async function deleteScannedMessage(msg: SynwaySmsMessage) {
    const confirmed = window.confirm(
      "Delete this SMS from Synway device and database?"
    );

    if (!confirmed) return;

    try {
      const synwayResult = await window.electronAPI.synway.deleteRxSms(config, {
        port: msg.queriedPort,
        number: msg.number,
        dateTime: msg.dateTime
      });

      if (synwayResult.result !== "ok") {
        throw new Error(
          synwayResult.content || "Failed to delete SMS from Synway device"
        );
      }

      const dbResult =
        await window.electronAPI.database.deleteIncomingMessageByFields({
          deviceHost: config.baseUrl.replace(/^https?:\/\//, ""),
          queriedPort: msg.queriedPort,
          dateTime: msg.dateTime,
          number: msg.number,
          message: msg.message
        });

      setMessages((prev) => prev.filter((item) => item.id !== msg.id));

      if (selectedMessage?.id === msg.id) {
        setSelectedMessage(null);
      }

      await loadIncomingTodayMessages();

      if (dbResult.affectedRows > 0) {
        onSuccess("SMS deleted from Synway device and database.");
      } else {
        onSuccess(
          "SMS deleted from Synway device. Database record was not found."
        );
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to delete SMS");
    }
  }

  return {
    ports,
    setPorts,
    messages,
    setMessages,
    selectedMessage,
    setSelectedMessage,
    selectedPortFilter,
    scanProgress,
    scanCurrent,
    scanTotal,
    filteredMessages,
    handlePortClick,
    clearPortFilter,
    cancelScan,
    refreshMessages,
    deleteScannedMessage
  };
}