export const commands = [
  "new",
  "open",
  "import",
  "save",
  "export",
  "search",
  "sidebar",
  "panel",
  "preview",
  "rich",
  "code",
  "settings",
  "templates",
  "validate",
  "changes",
  "help",
] as const;
export type Command = (typeof commands)[number];
export function isCommand(value: unknown): value is Command {
  return (
    typeof value === "string" && (commands as readonly string[]).includes(value)
  );
}
