export {};

declare global {
  interface Window {
    electronAPI: {
      appInfo: {
        name: string;
        version: string;
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