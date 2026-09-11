import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[20px] bg-[#E0E5EC] px-4 py-2.5 text-sm text-[#3D4852] font-body neu-inset-deep placeholder:text-[#A0AEC0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF]/30 border-0 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
