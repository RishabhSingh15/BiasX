"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-0 neu-inset transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF]/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#6C63FF] data-[state=unchecked]:bg-[#E0E5EC]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-[1px_2px_4px_rgba(0,0,0,0.2)] ring-0 transition-transform duration-300 data-[state=checked]:translate-x-5.5 data-[state=unchecked]:translate-x-0.5"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
