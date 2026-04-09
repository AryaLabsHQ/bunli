import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<typeof Loader2>) {
  return (
    <Loader2
      className={cn("size-4 animate-spin", className)}
      role="status"
      aria-label="Loading"
      {...props}
    />
  );
}

export { Spinner };
