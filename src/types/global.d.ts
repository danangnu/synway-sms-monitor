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
      };
    };
  }
}