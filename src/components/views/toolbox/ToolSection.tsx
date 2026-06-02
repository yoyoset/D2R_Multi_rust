import React from 'react';
import { cn } from '../../../lib/utils';

interface ToolSectionProps {
    icon: React.ReactNode;
    title: string;
    color?: 'player' | 'danger' | 'net' | 'default';
    children: React.ReactNode;
    className?: string;
}

export const ToolSection: React.FC<ToolSectionProps> = ({ icon, title, color = 'default', children, className }) => {
    return (
        <div className={cn("flex flex-col min-w-0 h-full", className)}>
            <div className="px-3 py-1.5 bg-surface/50 border-b border-line flex items-center gap-2 flex-shrink-0">
                <span className={cn(
                    "opacity-50",
                    color === 'player' ? "text-player" :
                    color === 'danger' ? "text-danger" :
                    color === 'net' ? "text-net" : "text-text-dim"
                )}>
                    {icon}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-text-dim truncate">
                    {title}
                </span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {children}
            </div>
        </div>
    );
};
