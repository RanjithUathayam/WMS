export {};

declare global {
  interface Window {
    electronAPI: {
      getMacAddress: () => Promise<string | null>;
    };
  }
}
