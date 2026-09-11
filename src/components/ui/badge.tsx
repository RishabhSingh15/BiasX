import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[16px] px-2.5 py-0.5 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#6C63FF]/30",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#6C63FF] text-white shadow-sm",
        secondary: "border-transparent bg-[#E0E5EC] text-[#3D4852] shadow-[2px_2px_4px_rgba(163,177,198,0.5),-2px_-2px_4px_rgba(255,255,255,0.5)]",
        destructive: "bg-[#FF6B6B]/15 text-[#FF6B6B] border border-[#FF6B6B]/30",
        outline: "text-[#3D4852] border border-[#A0AEC0]/40 bg-[#E0E5EC]",
        bullish: "bg-[#38B2AC]/15 text-[#38B2AC] border border-[#38B2AC]/30",
        bearish: "bg-[#FF6B6B]/15 text-[#FF6B6B] border border-[#FF6B6B]/30",
        warning: "bg-[#F6AD55]/15 text-[#F6AD55] border border-[#F6AD55]/30",
        info: "bg-[#6C63FF]/15 text-[#6C63FF] border border-[#6C63FF]/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
