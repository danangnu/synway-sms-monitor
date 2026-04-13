import type {
  DashboardPortCard,
  SynwayConfig,
  SynwayPortState,
  SynwaySmsMessage
} from "../types/synway";

type SynwayApiResponse = {
  result: string;
  content: string;
};

export async function testSynwayConnection(config: SynwayConfig) {
  const result = (await window.electronAPI.synway.testConnection(
    config
  )) as SynwayApiResponse;

  if (result.result !== "ok") {
    throw new Error(result.content || "Synway API returned error");
  }

  return result;
}

export async function getPortStates(
  config: SynwayConfig
): Promise<SynwayPortState[]> {
  const result = (await window.electronAPI.synway.getPortInfo(
    config
  )) as SynwayApiResponse;

  if (result.result !== "ok") {
    throw new Error(result.content || "Failed to get port info");
  }

  const content = result.content || "";
  const cleaned = content.replace(/^total:\d+;portstate:/, "").replace(/;$/, "");
  const states = cleaned.split(",");

  return states.map((value, index) => ({
    port: index,
    stateCode: Number(value || 0)
  }));
}

export async function getSmsByPort(
  config: SynwayConfig,
  port: number
): Promise<SynwaySmsMessage[]> {
  const result = (await window.electronAPI.synway.getSmsByPort(
    config,
    port
  )) as SynwayApiResponse;

  if (result.result !== "ok") {
    return [];
  }

  return parseSmsContent(result.content, port);
}

export async function getAllSms(config: SynwayConfig, totalPorts = 32) {
  const all: SynwaySmsMessage[] = [];

  for (let port = 0; port < totalPorts; port += 1) {
    const items = await getSmsByPort(config, port);
    all.push(...items);
  }

  return all;
}

function parseSmsContent(
  content: string,
  queriedPort: number
): SynwaySmsMessage[] {
  if (!content) return [];

  const totalMatch = content.match(/^total:(\d+);/);
  const total = totalMatch ? Number(totalMatch[1]) : 0;

  if (!total) return [];

  const payload = content.replace(/^total:\d+;/, "");
  const records = payload.split(/\|E;?/).filter((x) => x.trim() !== "");

  return records.map((record, idx) => {
    // Expected format:
    // YYYY-MM-DD HH:mm:ss:PORTINFO:SENDER:MESSAGE
    const match = record.match(
      /^(?<dt>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}):(?<portinfo>[^:]+):(?<number>[^:]+):(?<message>.*)$/
    );

    if (!match?.groups) {
      return {
        id: `${queriedPort}-${idx}-${Date.now()}`,
        queriedPort,
        dateTime: "",
        portInfo: "",
        simNumber: null,
        number: "",
        message: record
      };
    }

    const dateTime = match.groups.dt;
    const portInfo = match.groups.portinfo;
    const number = match.groups.number;
    const message = match.groups.message;

    // Examples:
    // 1(C)(61411990001)
    // 1(C)(-1)
    // 26(C) (-1)
    const simMatches = [...portInfo.matchAll(/\(([^()]*)\)/g)];
    let simNumber: string | null = null;

    if (simMatches.length > 0) {
      const lastGroup = simMatches[simMatches.length - 1]?.[1];
      if (lastGroup && lastGroup !== "-1" && /^\+?\d+$/.test(lastGroup)) {
        simNumber = lastGroup;
      }
    }

    return {
      id: `${queriedPort}-${idx}-${dateTime}-${number}`,
      queriedPort,
      dateTime,
      portInfo,
      simNumber,
      number,
      message
    };
  });
}

export function buildDashboardPorts(
  portStates: SynwayPortState[],
  messages: SynwaySmsMessage[]
): DashboardPortCard[] {
  return portStates.map((portState) => {
    const portMessages = messages
      .filter((m) => m.queriedPort === portState.port)
      .sort((a, b) => (a.dateTime < b.dateTime ? 1 : -1));

    let state: "active" | "inactive" | "has_sms" = "inactive";

    if (portMessages.length > 0) {
      state = "has_sms";
    } else if (portState.stateCode !== 0) {
      state = "active";
    }

    const phoneNumber =
      portMessages.find((m) => m.simNumber && m.simNumber !== "-1")?.simNumber ??
      null;

    return {
      port: portState.port,
      stateCode: portState.stateCode,
      state,
      smsCount: portMessages.length,
      lastTime: portMessages[0]?.dateTime,
      phoneNumber
    };
  });
}