import { useState } from "react";
import type { SentSmsRow } from "../types/sms";

type UseSentMessagesOptions = {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function useSentMessages({
  onSuccess,
  onError
}: UseSentMessagesOptions) {
  const [sentMessages, setSentMessages] = useState<SentSmsRow[]>([]);
  const [sentLoading, setSentLoading] = useState(false);
  const [sentStatusFilter, setSentStatusFilter] = useState("");
  const [sentKeywordFilter, setSentKeywordFilter] = useState("");

  async function loadSentMessages() {
    if (!window.electronAPI?.database?.getSentMessages) {
      console.warn("Electron database API is not available yet.");
      return;
    }

    setSentLoading(true);

    try {
      const result = await window.electronAPI.database.getSentMessages({
        status: sentStatusFilter.trim() || undefined,
        keyword: sentKeywordFilter.trim() || undefined,
        limit: 100
      });

      if (result.ok) {
        setSentMessages(result.rows);
      }
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Failed to load sent SMS history"
      );
    } finally {
      setSentLoading(false);
    }
  }

  async function deleteSentMessage(id: number) {
    const confirmed = window.confirm("Delete this sent SMS from database?");

    if (!confirmed) return;

    try {
      const result = await window.electronAPI.database.deleteSentMessage({ id });

      if (result.affectedRows > 0) {
        onSuccess("Sent SMS deleted.");
        await loadSentMessages();
        return;
      }

      onError("Sent SMS was not found.");
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Failed to delete sent SMS"
      );
    }
  }

  return {
    sentMessages,
    sentLoading,
    sentStatusFilter,
    sentKeywordFilter,
    setSentStatusFilter,
    setSentKeywordFilter,
    loadSentMessages,
    deleteSentMessage
  };
}