export type SynwayConfig = {
  baseUrl: string;
  username: string;
  password: string;
};

export type SynwayPortState = {
  port: number;
  stateCode: number;
};

export type SynwaySmsMessage = {
  id: string;
  queriedPort: number;
  dateTime: string;
  portInfo: string;
  simNumber?: string | null;
  number: string;
  message: string;
};

export type DashboardPortCard = {
  port: number;
  state: "active" | "inactive" | "has_sms";
  smsCount: number;
  lastTime?: string;
  stateCode: number;
};