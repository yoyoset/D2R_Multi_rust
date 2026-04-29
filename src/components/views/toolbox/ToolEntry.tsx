import React from 'react';
import { cn } from '../../../lib/utils';

interface ToolEntryProps {
    icon: React.ReactNode;
    title: string;
    onClick: () => void;
    color?: 'rose' | 'zinc' | 'emerald' | 'blue';
    disabled?: boolean;
}

export const ToolEntry: React.FC<ToolEntryProps> = ({ icon, title, onClick, color = 'zinc', disabled }) => {
    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "w-full flex items-center justify-between px-3 py-1.5 rounded-sm border border-transparent transition-all hover:bg-white/5 hover:border-white/5 group",
                color === 'rose' ? "hover:bg-rose-500/5 hover:border-rose-500/10" : 
                color === 'emerald' ? "hover:bg-emerald-500/5 hover:border-emerald-500/10" : 
                color === 'blue' ? "hover:bg-blue-500/5 hover:border-blue-500/10" : "",
                disabled && "opacity-30 cursor-not-allowed grayscale"
            )}
        >
            <div className="flex items-center gap-2.5">
                <span className={cn(
                    "opacity-40 group-hover:opacity-100 transition-opacity",
                    color === 'rose' ? "text-rose-500" : 
                    color === 'emerald' ? "text-emerald-500" : 
                    color === 'blue' ? "text-blue-500" : "text-zinc-500 group-hover:text-primary"
                )}>
                    {icon}
                </span>
                <span className={cn(
                    "text-[10px] font-bold uppercase tracking-tight",
                    color === 'rose' ? "text-rose-500/80 group-hover:text-rose-500" : 
                    color === 'emerald' ? "text-emerald-500/80 group-hover:text-emerald-500" : 
                    color === 'blue' ? "text-blue-500/80 group-hover:text-blue-500" : "text-zinc-400 group-hover:text-zinc-200"
                )}>
                    {title}
                </span>
            </div>
            <ChevronRight size={8} className="text-zinc-800 group-hover:text-zinc-600 transition-colors" />
        </button>
    );
};

const ChevronRight = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m9 18 6-6-6-6" />
    </svg>
);
