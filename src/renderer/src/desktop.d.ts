import type { Command } from "../../shared/commands";
declare global {
  interface Window {
    desktop?: {
      platform: string;
      onCommand: (callback: (command: Command) => void) => () => void;
    };
  }
}
