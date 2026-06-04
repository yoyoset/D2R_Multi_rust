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
        <header className="topnav">
            <div className="brand">
                <div className="brand-text">
                    <div className="bt-name">{t('app_name_part1')} <b>{t('app_name_part2')}</b></div>
                    <div className="bt-mode">
                        <ShieldCheck
                            size={12}
                            className={cn(
                                isAdmin ? "text-player" : "text-text-faint"
                            )}
                        />
                        <span>
                            {isAdmin ? t('admin_mode') : t('user_mode')}
                        </span>
                    </div>
                </div>
            </div>

            <nav className="tabs">
                <button
                    onClick={() => setCurrentView('dashboard')}
                    className={cn("tab", currentView === 'dashboard' && "active")}
                    title={t('dashboard')}
                >
                    <LayoutGrid size={15} />
                    <span className="tab-label">{t('dashboard')}</span>
                </button>
                <button
                    onClick={() => setCurrentView('accounts')}
                    className={cn("tab", currentView === 'accounts' && "active")}
                    title={t('accounts')}
                >
                    <Users size={15} />
                    <span className="tab-label">{t('accounts')}</span>
                </button>
                <button
                    onClick={() => setCurrentView('manual')}
                    className={cn("tab", currentView === 'manual' && "active")}
                    title={t('manual')}
                >
                    <Wrench size={15} />
                    <span className="tab-label">{t('manual')}</span>
                </button>
            </nav>

            <div className="nav-spacer"></div>

            <div className="nav-tools">
                <button
                    onClick={() => setIsGuideOpen(true)}
                    className="icon-btn"
                    title={t('user_guide_title')}
                >
                    <BookOpen size={16} />
                </button>

                <LanguageSelector />

                <button
                    onClick={() => setIsDonateOpen(true)}
                    className="coffee-btn"
                >
                    <Coffee size={16} className="fill-white" />
                    <span>{t('donate')}</span>
                </button>

                <button onClick={() => setIsSettingsOpen(true)} className="icon-btn">
                    <Settings size={16} />
                </button>
            </div>
        </header>
    );
}
