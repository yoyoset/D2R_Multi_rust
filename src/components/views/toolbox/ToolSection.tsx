import React from 'react';
import { cn } from '../../../lib/utils';

interface ToolSectionProps {
    icon: React.ReactNode;
    title: string;
    color?: 'emerald' | 'rose' | 'blue' | 'zinc';
    children: React.ReactNode;
    className?: string;
}

export const ToolSection: React.FC<ToolSectionProps> = ({ icon, title, color = 'zinc', children, className }) => {
    return (
        <div className={cn("flex flex-col min-w-0 h-full", className)}>
            <div className="px-3 py-1.5 bg-zinc-900/50 border-b border-white/5 flex items-center gap-2 flex-shrink-0">
                <span className={cn(
                    "opacity-50",
                    color === 'emerald' ? "text-emerald-500" : 
                    color === 'rose' ? "text-rose-500" : 
                    color === 'blue' ? "text-blue-500" : "text-zinc-500"
                )}>
                    {icon}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 truncate">
                    {title}
                </span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {children}
            </div>
        </div>
    );
};
