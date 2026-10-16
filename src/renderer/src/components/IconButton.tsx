import type { ComponentProps } from "react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function IconButton({ label, side = "bottom", ...props }: ComponentProps<typeof Button> & {
  label: string;
  side?: ComponentProps<typeof TooltipContent>["side"];
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={label} {...props} />
      </TooltipTrigger>
      <TooltipContent side={side} sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}
