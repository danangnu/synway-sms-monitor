import type { SynwaySmsMessage } from "./synway";

export type SentSmsRow = {
  id: number;
  device_host: string;
  send_port: number;
  destination_number: string;
  message_text: string;
  encoding: string;
  userid: string | null;
  task_id: string | null;
  gateway_result: string | null;
  gateway_content: string | null;
  send_status: string;
  status_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type IncomingTodayRow = {
  id: number;
  device_host: string;
  queried_port: number;
  message_datetime: string;
  synway_datetime: string;
  sender_number: string | null;
  message_text: string;
  port_info: string | null;
  imported_at: string;
};

export type SmsMessageSelection = SynwaySmsMessage | null;