export {};

declare global {
  interface Window {
    electronAPI: {
      appInfo: {
        name: string;
        version: string;
      };
      settings: {
        load: () => Promise<{
          baseUrl: string;
          username: string;
          password: string;
          db?: {
            host: string;
            port?: number;
            user: string;
            password: string;
            database: string;
          };
        } | null>;
        save: (settings: {
          baseUrl: string;
          username: string;
          password: string;
          db?: {
            host: string;
            port?: number;
            user: string;
            password: string;
            database: string;
          };
        }) => Promise<{
          ok: boolean;
          path: string;
        }>;
      };
      exportData: {
        messagesCsv: (messages: Array<{
          queriedPort: number;
          dateTime: string;
          number: string;
          message: string;
        }>) => Promise<{
          ok: boolean;
          canceled?: boolean;
          path?: string;
        }>;
      };
      synway: {
        testConnection: (config: {
          baseUrl: string;
          username: string;
          password: string;
        }) => Promise<any>;
        getPortInfo: (config: {
          baseUrl: string;
          username: string;
          password: string;
        }) => Promise<any>;
        getSmsByPort: (
          config: {
            baseUrl: string;
            username: string;
            password: string;
          },
          port: number
        ) => Promise<any>;
        sendSms: (
          config: {
            baseUrl: string;
            username: string;
            password: string;
          },
          payload: {
            userid?: string;
            num: string;
            port: number | string;
            encoding?: string;
            message: string;
          }
        ) => Promise<{
          result: string;
          content: string;
        }>;
        querySentSms: (
          config: {
            baseUrl: string;
            username: string;
            password: string;
          },
          payload: {
            taskId: string | number;
          }
        ) => Promise<{
          result: string;
          content: string;
        }>;
      };
      database: {
        saveMessages: (payload: {
          deviceHost: string;
          messages: Array<{
            queriedPort: number;
            dateTime: string;
            number: string;
            message: string;
            portInfo?: string;
          }>;
        }) => Promise<{
          ok: boolean;
          total: number;
          inserted: number;
          skipped: number;
        }>;
        saveSentMessage: (payload: {
          deviceHost: string;
          port: number | string;
          num: string;
          message: string;
          encoding?: string;
          userid?: string;
          taskId?: string | null;
          gatewayResult?: string | null;
          gatewayContent?: string | null;
          sendStatus?: string;
        }) => Promise<{
          ok: boolean;
          inserted: boolean;
          id?: number | null;
        }>;
        updateSentMessageStatus: (payload: {
          id: number;
          sendStatus: string;
          gatewayResult?: string | null;
          gatewayContent?: string | null;
        }) => Promise<{
          ok: boolean;
          affectedRows: number;
        }>;
        getSentMessages: (filters?: {
          port?: string;
          destination?: string;
          status?: string;
          keyword?: string;
          limit?: number;
        }) => Promise<{
          ok: boolean;
          rows: Array<{
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
          }>;
        }>;
      };
    };
  }
}