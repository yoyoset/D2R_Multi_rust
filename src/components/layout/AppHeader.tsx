import { LayoutGrid, Users, Wrench, Coffee, BookOpen, Settings, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "../ui/LanguageSelector";
import { cn } from "../../lib/utils";
import { View } from "../../hooks/useAppCore";

interface AppHeaderProps {
    isAdmin: boolean;
    currentView: View;
    setCurrentView: (view: View) => void;
    setIsGuideOpen: (val: boolean) => void;
    setIsDonateOpen: (val: boolean) => void;
    setIsSettingsOpen: (val: boolean) => void;
}

export function AppHeader({
    isAdmin,
    currentView,
    setCurrentView,
    setIsGuideOpen,
    setIsDonateOpen,
    setIsSettingsOpen
}: AppHeaderProps) {
    const { t } = useTranslation();

    return (
        <header className="h-14 border-b border-white/5 bg-zinc-950 flex items-center px-6 justify-between flex-shrink-0 relative z-50">
            <div className="flex items-center gap-3">
                <div className="flex flex-col">
                    <span className="font-black text-[14px] text-white uppercase tracking-tighter leading-none">{t('app_name_part1')} <span className="text-zinc-500">{t('app_name_part2')}</span></span>
                    <div className="flex items-center gap-1 mt-0.5">
                        <ShieldCheck
                            size={16}
                            className={cn(
                                isAdmin ? "text-primary" : "text-zinc-600"
                            )}
                        />
                        <span className={cn("text-[10px] font-mono tracking-tighter uppercase", isAdmin ? "text-primary/80" : "text-zinc-600")}>
                            {isAdmin ? t('admin_mode') : t('user_mode')}
                        </span>
                    </div>
                </div>

                <nav className="flex items-center gap-0.5 bg-zinc-900 border border-white/5 p-0.5 rounded-sm">
                    <button
                        onClick={() => setCurrentView('dashboard')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-tight transition-all ${currentView === 'dashboard' ? 'bg-zinc-800 text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <LayoutGrid size={16} />
                        {t('dashboard')}
                    </button>
                    <button
                        onClick={() => setCurrentView('accounts')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-tight transition-all ${currentView === 'accounts' ? 'bg-zinc-800 text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <Users size={16} />
                        {t('accounts')}
                    </button>
                    <button
                        onClick={() => setCurrentView('manual')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-tight transition-all ${currentView === 'manual' ? 'bg-zinc-800 text-primary shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <Wrench size={16} />
                        {t('manual')}
                    </button>
                </nav>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={() => setIsGuideOpen(true)}
                    className="text-zinc-500 hover:text-white transition-colors p-1"
                    title={t('user_guide_title')}
                >
                    <BookOpen size={16} />
                </button>

                <LanguageSelector />

                <button
                    onClick={() => setIsDonateOpen(true)}
                    className="flex items-center gap-2 px-6 py-1.5 rounded-full bg-[#FF5F5F] hover:bg-[#FF5F5F]/90 text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] group"
                >
                    <Coffee size={16} className="fill-white" />
                    <span className="text-[10px] font-bold tracking-tight uppercase">{t('donate')}</span>
                </button>

                <button onClick={() => setIsSettingsOpen(true)} className="text-zinc-500 hover:text-primary transition-colors">
                    <Settings size={16} />
                </button>
            </div>
        </header>
    );
}
