export function extractTaskId(content: string) {
  const text = String(content || "");

  const patterns = [
    /taskid[:=]\s*([A-Za-z0-9_-]+)/i,
    /task_id[:=]\s*([A-Za-z0-9_-]+)/i,
    /task\s*id[:=]\s*([A-Za-z0-9_-]+)/i,
    /id[:=]\s*([A-Za-z0-9_-]+)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  if (/^[A-Za-z0-9_-]+$/.test(text.trim())) {
    return text.trim();
  }

  return null;
}

export function mapSynwaySendStatus(result: string, content: string) {
  const r = String(result || "").toLowerCase();
  const c = String(content || "").toLowerCase();

  if (r !== "ok") {
    return "failed";
  }

  if (
    c.includes("success") ||
    c.includes("sent") ||
    c.includes("send success") ||
    c.includes("ok")
  ) {
    return "success";
  }

  if (
    c.includes("fail") ||
    c.includes("error") ||
    c.includes("timeout") ||
    c.includes("no available") ||
    c.includes("queue full")
  ) {
    return "failed";
  }

  return "submitted";
}