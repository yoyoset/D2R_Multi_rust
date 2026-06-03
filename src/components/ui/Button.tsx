import * as React from "react"
import { cn } from "../../lib/utils"
import { Loader2 } from "lucide-react"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'solid' | 'outline' | 'ghost' | 'danger' | 'success' | 'info'
    size?: 'sm' | 'md' | 'lg'
    isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'solid', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        const variants = {
            // solid: Primary Color BG + White Text
            solid: "bg-gold text-text font-black hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-sm disabled:opacity-50",
            outline: "border border-line-2 text-text-dim hover:bg-surface hover:text-text transition-all duration-200",
            ghost: "text-text-dim hover:text-gold hover:bg-white/5 transition-all text-[14px] font-black uppercase tracking-wider",
            danger: "bg-danger-600/10 border border-danger-600/30 text-danger-500 hover:bg-danger-600/20 transition-colors shadow-sm disabled:opacity-50",
            success: "bg-player-600/10 border border-player/30 text-player-500 hover:bg-player-600/20 transition-colors shadow-sm disabled:opacity-50",
            info: "bg-net-600/10 border border-net/30 text-net-500 hover:bg-net-600/20 transition-colors shadow-sm disabled:opacity-50",
        }

        const sizes = {
            sm: "h-7 px-2 text-[10px] font-black uppercase tracking-widest",
            md: "h-9 px-4 text-[10px] font-black uppercase tracking-widest",
            lg: "h-11 px-8 text-[14px] font-black uppercase tracking-widest",
        }

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    "inline-flex items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-line disabled:pointer-events-none",
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
