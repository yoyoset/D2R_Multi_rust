import * as React from "react"
import { cn } from "../../lib/utils"
import { Loader2 } from "lucide-react"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'solid' | 'outline' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'solid', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        const variants = {
            // solid: Primary Color BG + White Text
            solid: "bg-primary text-white font-semibold hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-sm disabled:opacity-50",
            outline: "border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-all duration-200",
            ghost: "text-zinc-400 hover:text-primary hover:bg-white/5 transition-all",
            danger: "bg-red-950/20 text-red-500 border border-red-900/50 hover:bg-red-950/40 hover:text-red-400 transition-colors",
        }

        const sizes = {
            sm: "h-8 px-3 text-xs tracking-wide",
            md: "h-9 px-4 text-sm font-medium",
            lg: "h-11 px-8 text-base font-medium uppercase tracking-widest",
        }

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    "inline-flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 disabled:pointer-events-none",
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button }
