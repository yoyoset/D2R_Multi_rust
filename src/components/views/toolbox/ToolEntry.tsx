import React from 'react';
import { cn } from '../../../lib/utils';

interface ToolEntryProps {
    icon: React.ReactNode;
    title: string;
    onClick: () => void;
    color?: 'danger' | 'default' | 'player' | 'net';
    disabled?: boolean;
}

export const ToolEntry: React.FC<ToolEntryProps> = ({ icon, title, onClick, color = 'default', disabled }) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "w-full flex items-center justify-between px-3 py-1.5 rounded-sm border border-transparent transition-all hover:bg-line/5 hover:border-line group",
                color === 'danger' ? "hover:bg-danger/5 hover:border-danger/10" :
                color === 'player' ? "hover:bg-player/5 hover:border-player/10" :
                color === 'net' ? "hover:bg-net/5 hover:border-net/10" : "",
                disabled && "opacity-30 cursor-not-allowed grayscale"
            )}
        >
            <div className="flex items-center gap-2.5">
                <span className={cn(
                    "opacity-40 group-hover:opacity-100 transition-opacity",
                    color === 'danger' ? "text-danger" :
                    color === 'player' ? "text-player" :
                    color === 'net' ? "text-net" : "text-text-dim group-hover:text-gold"
                )}>
                    {icon}
                </span>
                <span className={cn(
                    "text-[10px] font-bold uppercase tracking-tight",
                    color === 'danger' ? "text-danger/80 group-hover:text-danger" :
                    color === 'player' ? "text-player/80 group-hover:text-player" :
                    color === 'net' ? "text-net/80 group-hover:text-net" : "text-text-dim group-hover:text-text"
                )}>
                    {title}
                </span>
            </div>
            <ChevronRight size={16} className="text-text-faint group-hover:text-text-dim transition-colors" />
        </button>
    );
};

const ChevronRight = ({ size, className }: { size: number, className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m9 18 6-6-6-6" />
    </svg>
);
