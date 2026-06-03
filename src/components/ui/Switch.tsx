import React from 'react';
import { cn } from '../../lib/utils';

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    description?: string;
    disabled?: boolean;
    className?: string;
    id?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, description, disabled, className, id }) => {
    return (
        <div 
            className={cn(
                "flex items-start justify-between w-full group cursor-pointer select-none py-1.5 px-0.5 transition-opacity",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
            onClick={() => !disabled && onChange(!checked)}
        >
            {(label || description) && (
                <div className="flex flex-col gap-0.25">
                    {label && (
                        <span className="text-[10px] font-bold text-text-dim group-hover:text-text transition-colors uppercase tracking-tight">
                            {label}
                        </span>
                    )}
                    {description && (
                        <span className="text-[10px] text-text-dim uppercase tracking-tighter leading-tight italic">
                            {description}
                        </span>
                    )}
                </div>
            )}
            
            <div className="relative pt-0.5 flex-shrink-0">
                <input
                    id={id}
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    readOnly
                    disabled={disabled}
                />
                {/* Background Track */}
                <div className={cn(
                    "w-8 h-4 rounded-sm transition-colors duration-300 border",
                    checked 
                        ? "bg-gold/90 border-gold shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]" 
                        : "bg-surface border-line-2"
                )}></div>
                {/* Thumb Slider */}
                <div className={cn(
                    "absolute top-[4px] left-[2px] w-2.5 h-2.5 bg-white rounded-[1px] transition-transform duration-200 shadow-xl",
                    checked ? "translate-x-[1.125rem]" : "translate-x-0"
                )}></div>
            </div>
        </div>
    );
};
