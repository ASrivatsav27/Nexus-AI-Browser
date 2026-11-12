export type BrowserTab = { id: string; url: string; title: string; loading: boolean; error: string; canGoBack: boolean; canGoForward: boolean };
export type BrowserState = { activeId?: string; tabs: BrowserTab[] };
export type BrowserCommand = 'state' | 'new' | 'select' | 'close' | 'navigate' | 'back' | 'forward' | 'reload' | 'bounds' | 'theme';
declare global {
  interface Window {
    nexusBrowser?: {
      command: (command: BrowserCommand, value?: unknown) => Promise<BrowserState>;
      subscribe: (callback: (state: BrowserState) => void) => () => void;
    };
  }
}
