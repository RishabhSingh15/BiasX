import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[24px] text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C63FF]/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer font-heading select-none",
  {
    variants: {
      variant: {
        default: "bg-[#6C63FF] text-white shadow-[4px_4px_10px_rgba(108,99,255,0.35),-2px_-2px_6px_rgba(255,255,255,0.7)] hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0",
        destructive: "bg-[#FF6B6B] text-white shadow-[4px_4px_10px_rgba(255,107,107,0.35),-2px_-2px_6px_rgba(255,255,255,0.7)] hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0",
        outline: "bg-[#E0E5EC] text-[#3D4852] border border-[#A0AEC0]/40 shadow-[2px_2px_5px_rgba(163,177,198,0.4),-2px_-2px_5px_rgba(255,255,255,0.5)] hover:border-[#6C63FF]/50 hover:-translate-y-0.5 active:translate-y-0",
        secondary: "bg-[#E0E5EC] text-[#3D4852] shadow-[4px_4px_8px_rgba(163,177,198,0.6),-4px_-4px_8px_rgba(255,255,255,0.5)] hover:-translate-y-0.5 active:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.6),inset_-4px_-4px_8px_rgba(255,255,255,0.5)] active:translate-y-0",
        ghost: "text-[#3D4852] hover:bg-[#D8DFE8]/60 hover:text-[#3D4852]",
        link: "text-[#6C63FF] underline-offset-4 hover:underline",
        bullish: "bg-[#38B2AC] text-white shadow-[4px_4px_10px_rgba(56,178,172,0.35),-2px_-2px_6px_rgba(255,255,255,0.7)] hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0",
        bearish: "bg-[#FF6B6B] text-white shadow-[4px_4px_10px_rgba(255,107,107,0.35),-2px_-2px_6px_rgba(255,255,255,0.7)] hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0",
        warning: "bg-[#F6AD55] text-[#3D4852] shadow-[4px_4px_10px_rgba(246,173,85,0.35),-2px_-2px_6px_rgba(255,255,255,0.7)] hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-[20px] px-3.5 text-xs",
        lg: "h-12 rounded-[26px] px-8 text-base",
        xl: "h-14 rounded-[28px] px-10 text-base",
        icon: "h-10 w-10 rounded-[20px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
