import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-border-subtle bg-bg-elevated px-2.5 py-2 text-base text-text-primary transition-colors outline-none placeholder:text-text-disabled focus-visible:border-accent-primary focus-visible:ring-2 focus-visible:ring-accent-primary/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/30 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
