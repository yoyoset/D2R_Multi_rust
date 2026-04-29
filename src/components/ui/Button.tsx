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
            solid: "bg-primary text-white font-black hover:opacity-90 active:scale-[0.98] transition-all duration-200 shadow-sm disabled:opacity-50",
            outline: "border border-white/10 text-zinc-300 hover:bg-zinc-900 hover:text-white transition-all duration-200",
            ghost: "text-zinc-400 hover:text-primary hover:bg-white/5 transition-all text-xs font-black uppercase tracking-wider",
            danger: "bg-rose-600/10 border border-rose-600/30 text-rose-500 hover:bg-rose-600/20 transition-colors shadow-sm disabled:opacity-50",
            success: "bg-emerald-600/10 border border-emerald-600/30 text-emerald-500 hover:bg-emerald-600/20 transition-colors shadow-sm disabled:opacity-50",
            info: "bg-blue-600/10 border border-blue-600/30 text-blue-500 hover:bg-blue-600/20 transition-colors shadow-sm disabled:opacity-50",
        }

        const sizes = {
            sm: "h-7 px-2 text-[9px] font-black uppercase tracking-widest",
            md: "h-9 px-4 text-[11px] font-black uppercase tracking-widest",
            lg: "h-11 px-8 text-sm font-black uppercase tracking-widest",
        }

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    "inline-flex items-center justify-center rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 disabled:pointer-events-none",
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
