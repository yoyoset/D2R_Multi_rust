import { cn } from '../../../lib/utils';

interface ToolItemProps {
    icon: React.ReactNode;
    title: string;
    onClick: () => void;
    color: string;
}

export const ToolItem: React.FC<ToolItemProps> = ({ icon, title, onClick, color }) => {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "group flex items-center gap-2.5 px-2.5 py-1.5 rounded-sm border border-transparent hover:bg-white/[0.02] border-theme-glow imperial-glass-hover transition-all text-left w-full",
                color === 'emerald' ? "hover:border-emerald-500/20" :
                color === 'rose' ? "hover:border-danger-500/20" :
                color === 'amber' ? "hover:border-amber-500/20" :
                color === 'red' ? "hover:border-red-500/20" :
                "hover:border-blue-500/20"
            )}
        >
            <div className={cn(
                "w-5 h-5 flex items-center justify-center rounded-sm transition-all flex-shrink-0 border border-line",
                color === 'emerald' ? "text-player-500/60 bg-player-500/5 group-hover:text-player-400 group-hover:bg-player-500/10" :
                color === 'rose' ? "text-danger-500/60 bg-danger-500/5 group-hover:text-danger-400 group-hover:bg-danger-500/10" :
                color === 'amber' ? "text-amber-500/60 bg-amber-500/5 group-hover:text-amber-400 group-hover:bg-amber-500/10" :
                color === 'red' ? "text-red-500/60 bg-red-500/5 group-hover:text-red-400 group-hover:bg-red-500/10" :
                "text-net-500/60 bg-net-500/5 group-hover:text-net-400 group-hover:bg-net-500/10"
            )}>
                {icon}
            </div>
            <span className="text-[10px] font-bold text-text-dim tracking-tight group-hover:text-zinc-200 transition-colors uppercase truncate">
                {title}
            </span>
            <div className={cn(
                "ml-auto w-0.5 h-2 rounded-full opacity-0 group-hover:opacity-60 transition-all scale-y-0 group-hover:scale-y-100 flex-shrink-0",
                color === 'emerald' ? "bg-player-500" :
                color === 'rose' ? "bg-danger-500" :
                color === 'amber' ? "bg-amber-500" :
                color === 'red' ? "bg-red-500" :
                "bg-net-500"
            )} />
        </button>
    );
};
