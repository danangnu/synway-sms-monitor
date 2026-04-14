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
        } | null>;
        save: (settings: {
          baseUrl: string;
          username: string;
          password: string;
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
    };
  }
}