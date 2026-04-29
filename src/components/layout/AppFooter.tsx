import { Database, ShieldCheck, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";

interface AppFooterProps {
    isAdmin: boolean;
    accountCount: number;
    version: string;
}

export function AppFooter({ isAdmin, accountCount, version }: AppFooterProps) {
    const { t } = useTranslation();

    return (
        <footer className="h-6 border-t border-white/5 bg-zinc-950 flex items-center px-4 justify-between flex-shrink-0 z-50">
            <div className="flex items-center gap-5">
                <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-tighter">
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm bg-emerald-500/5 border border-emerald-500/10">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-zinc-500">{t('footer_runtime')}:</span>
                        <span className="text-emerald-500 font-bold">{t('footer_runtime_ready')}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-tighter group cursor-help">
                    <Database size={10} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    <span className="text-zinc-600">{t('footer_entities_total')}:</span>
                    <span className="text-zinc-300 font-bold tracking-normal">{accountCount.toString().padStart(2, '0')}</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-tighter">
                    <ShieldCheck size={10} className={cn(isAdmin ? "text-primary" : "text-zinc-600")} />
                    <span className="text-zinc-600">{t('footer_security_level')}:</span>
                    <span className={cn(
                        "px-1.5 py-0.5 rounded-sm font-bold",
                        isAdmin ? "bg-primary/10 text-primary border border-primary/20" : "bg-zinc-800/50 text-zinc-500 border border-white/5"
                    )}>
                        {isAdmin ? t('footer_security_privileged') : t('footer_security_limited')}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 text-zinc-700 font-mono text-[8px] uppercase tracking-[0.2em]">
                    <span className="px-1.5 py-0.5 border border-white/5 rounded-sm bg-white/2">
                        {t('footer_build')}: v{version}
                    </span>
                    <Activity size={10} className="text-zinc-800" />
                </div>
            </div>
        </footer>
    );
}
