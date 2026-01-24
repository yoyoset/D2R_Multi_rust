import React from 'react';
import { cn } from '../../lib/utils';

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, disabled, className }) => {
    return (
        <label className={cn(
            "flex items-center gap-3 cursor-pointer select-none",
            disabled && "opacity-50 cursor-not-allowed",
            className
        )}>
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => !disabled && onChange(e.target.checked)}
                    disabled={disabled}
                />
                <div className={cn(
                    "w-10 h-5 rounded-full transition-colors duration-300",
                    checked ? "bg-emerald-500/40" : "bg-black/40 border border-white/10"
                )}></div>
                <div className={cn(
                    "absolute top-1 left-1 w-3 h-3 rounded-full transition-transform duration-300 shadow-sm",
                    checked ? "translate-x-5 bg-emerald-400" : "translate-x-0 bg-zinc-600"
                )}></div>
            </div>
            {label && <span className="text-xs font-bold text-zinc-400">{label}</span>}
        </label>
    );
};
