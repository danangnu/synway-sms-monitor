import { useState } from "react";
import type { IncomingTodayRow } from "../types/sms";
import type { SynwayConfig, SynwaySmsMessage } from "../types/synway";

type UseIncomingTodayMessagesOptions = {
  config: SynwayConfig;
  selectedMessage?: SynwaySmsMessage | null;
  setMessages?: React.Dispatch<React.SetStateAction<SynwaySmsMessage[]>>;
  setSelectedMessage?: React.Dispatch<
    React.SetStateAction<SynwaySmsMessage | null>
  >;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function useIncomingTodayMessages({
  config,
  selectedMessage,
  setMessages,
  setSelectedMessage,
  onSuccess,
  onError
}: UseIncomingTodayMessagesOptions) {
  const [incomingTodayMessages, setIncomingTodayMessages] = useState<
    IncomingTodayRow[]
  >([]);
  const [incomingTodayLoading, setIncomingTodayLoading] = useState(false);
  const [incomingTodayKeyword, setIncomingTodayKeyword] = useState("");
  const [incomingTodayPort, setIncomingTodayPort] = useState("");

  async function loadIncomingTodayMessages() {
    if (!window.electronAPI?.database?.getTodayIncomingMessages) {
      console.warn("Incoming today API is not available yet.");
      return;
    }

    setIncomingTodayLoading(true);

    try {
      const result = await window.electronAPI.database.getTodayIncomingMessages({
        port: incomingTodayPort.trim() || undefined,
        keyword: incomingTodayKeyword.trim() || undefined,
        limit: 100
      });

      if (result.ok) {
        setIncomingTodayMessages(result.rows);
      }
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Failed to load today's incoming SMS"
      );
    } finally {
      setIncomingTodayLoading(false);
    }
  }

  async function deleteIncomingTodayMessage(item: IncomingTodayRow) {
    const confirmed = window.confirm(
      "Delete this SMS from Synway device and database?"
    );

    if (!confirmed) return;

    try {
      const synwayResult = await window.electronAPI.synway.deleteRxSms(config, {
        port: item.queried_port,
        number: item.sender_number || "",
        dateTime: item.synway_datetime
      });

      if (synwayResult.result !== "ok") {
        throw new Error(
          synwayResult.content || "Failed to delete SMS from Synway device"
        );
      }

      const dbResult = await window.electronAPI.database.deleteIncomingMessage({
        id: item.id
      });

      await loadIncomingTodayMessages();

      setMessages?.((prev) =>
        prev.filter(
          (msg) =>
            !(
              msg.queriedPort === item.queried_port &&
              msg.number === item.sender_number &&
              msg.message === item.message_text
            )
        )
      );

      if (
        selectedMessage &&
        selectedMessage.queriedPort === item.queried_port &&
        selectedMessage.number === item.sender_number &&
        selectedMessage.message === item.message_text
      ) {
        setSelectedMessage?.(null);
      }

      if (dbResult.affectedRows > 0) {
        onSuccess("Incoming SMS deleted from Synway device and database.");
      } else {
        onSuccess("SMS deleted from Synway device. Database row was not found.");
      }
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Failed to delete incoming SMS"
      );
    }
  }

  return {
    incomingTodayMessages,
    incomingTodayLoading,
    incomingTodayKeyword,
    incomingTodayPort,
    setIncomingTodayKeyword,
    setIncomingTodayPort,
    loadIncomingTodayMessages,
    deleteIncomingTodayMessage
  };
}