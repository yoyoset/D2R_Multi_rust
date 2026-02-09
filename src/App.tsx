import { useState, useEffect } from "react";
import { getConfig, launchGame, saveConfig, AppConfig, Account, checkAdmin, getWindowsUsers } from "./lib/api";
import { listen } from "@tauri-apps/api/event";
import { Settings, Globe, LayoutGrid, Users, Wrench, Heart, ShieldCheck } from "lucide-react";
import { SettingsModal } from "./components/modals/SettingsModal";
import { AccountModal } from "./components/modals/AccountModal";
import { DonateModal } from "./components/modals/DonateModal";
import { useTranslation } from "react-i18next";
import Dashboard from "./components/views/Dashboard";
import AccountManager from "./components/views/AccountManager";
import ManualTools from "./components/views/ManualTools";
import { cn } from "./lib/utils";
import { ToastContainer } from "./components/ui/Toast";
import { useLogs } from "./store/useLogs";


import { NotificationManager } from "./components/ui/NotificationManager";
import { useBlockingNotification } from "./store/useBlockingNotification";

type View = 'dashboard' | 'accounts' | 'manual';

function App() {
    const { t, i18n } = useTranslation();
    const [config, setConfig] = useState<AppConfig>({ accounts: [], game_path: '' });
    const [invalidAccountIds, setInvalidAccountIds] = useState<Set<string>>(new Set());
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const addLog = useLogs((state) => state.addLog);
    const launchLogs = useLogs((state) => state.logs);
    const clearLogs = useLogs((state) => state.clearLogs);


    const { show: showBlocking } = useBlockingNotification();

    // Auto Update Check
    const checkUpdateOnLaunch = async () => {
        try {
            const { check } = await import("@tauri-apps/plugin-updater");
            const update = await check();
            if (update) {
                showBlocking(
                    t('update_found'),
                    t('update_available_title', { version: update.version }) + "\n\n" + t('update_desc'),
                    [
                        {
                            label: t('update_manual'),
                            variant: 'outline',
                            onClick: () => {
                                import("@tauri-apps/plugin-opener").then(({ openUrl }) => {
                                    openUrl("https://github.com/SquareUncle/d2r-rust/releases/latest");
                                });
                            }
                        },
                        {
                            label: t('update_auto'),
                            variant: 'primary',
                            onClick: async () => {
                                // Close is handled by wrapper
                                try {
                                    // Feedback
                                    // addNotification('info', t('downloading')); 
                                    // We need to access addNotification from store here, which we have in component scope
                                    // But to keep it clean, we can just invoke the promise. 
                                    // Actually the onClick in component handles the async await.
                                    await update.downloadAndInstall();
                                    // Success feedback handled by component? No, we need to do it here.
                                    // But addNotification variable is available in scope? Yes.
                                } catch (e) {
                                    throw e; // Let wrapper handle error? Wrapper just closes.
                                    // We should handle error feedback here.
                                    console.error(e);
                                }
                            }
                        }
                    ],
                    'info'
                );
            }
        } catch (e) {
            // strickly fail silently on launch to not annoy users if offline
            console.error("Auto-update check failed:", e);
        }
    };

    const validateAccounts = async (accounts: Account[]) => {
        if (accounts.length === 0) return;
        try {
            const systemUsers = await getWindowsUsers(false);
            const lowerSystemUsers = systemUsers.map(u => u.toLowerCase());
            
            const invalidIds = new Set<string>();
            const invalidUsers = accounts.filter((acc: Account) => {
                const winUser = acc.win_user.toLowerCase();
                
                // Check if exists in any form (short or long)
                const exists = lowerSystemUsers.some(u => {
                    if (u === winUser) return true;
                    // Handle .\user or MACHINE\user vs user
                    const uParts = u.split("\\");
                    const winParts = winUser.split("\\");
                    const uShort = uParts[uParts.length - 1];
                    const winShort = winParts[winParts.length - 1];
                    
                    if (uShort === winShort) {
                        return true;
                    }
                    return false;
                });

                if (exists) return false;

                if (!acc.win_user.includes("\\") || acc.win_user.startsWith(".\\")) {
                    invalidIds.add(acc.id);
                    return true;
                }
                return false;
            });

            setInvalidAccountIds(invalidIds);

            if (invalidUsers.length > 0) {
                const names = invalidUsers.map(u => u.win_user).join(", ");
                addLog({ 
                    message: `检测到失效的系统用户: ${names}。这些账户在系统中不存在，请确认是否已手动删除或重命名。`, 
                    level: 'warn' 
                });
                
                showBlocking(
                    t('invalid_users_found') || '检测到失效账户',
                    (t('invalid_users_desc') || '以下账户在当前系统中不存在，请确认是否删除或重新创建：') + `\n\n${names}`,
                    [{ label: t('confirm') || '知道了', variant: 'primary', onClick: () => {} }],
                    'warning'
                );
            }
        } catch (e) {
            console.error("Failed to validate accounts:", e);
        }
    };

    useEffect(() => {
        const init = async () => {
            const cfg = await getConfig();
            setConfig(cfg);
            checkAdminStatus();
            checkUpdateOnLaunch();
            // Validate accounts after loading config
            validateAccounts(cfg.accounts);
        };
        init();

        const unlisten = listen('launch-log', (event: any) => {
            const payload = event.payload;
            addLog({
                message: payload.message,
                level: payload.level as any,
                category: 'launch'
            });
        });

        return () => {
            unlisten.then(f => f());
        };
    }, []);

    const checkAdminStatus = async () => {
        try {
            const admin = await checkAdmin();
            setIsAdmin(admin);
        } catch (e) {
            console.error('Failed to check admin status', e);
        }
    };



    const [currentView, setCurrentView] = useState<View>('dashboard');

    // Dashboard State
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [isLaunching, setIsLaunching] = useState(false);

    // Modals
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isDonateOpen, setIsDonateOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);

    // Apply Theme Color
    useEffect(() => {
        if (config.theme_color) {
            const hex = config.theme_color.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            document.documentElement.style.setProperty('--color-primary', `${r} ${g} ${b}`);
        }
    }, [config.theme_color]);

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const handleLaunch = async () => {
        if (!selectedAccountId) return;
        const account = config.accounts.find(a => a.id === selectedAccountId);
        if (!account) return;

        try {
            setIsLaunching(true);
            await launchGame(account, "");
        } catch (e) {
            const errorMsg = String(e);
            const displayMsg = errorMsg.includes('BNET_NOT_FOUND')
                ? t('bnet_not_found')
                : `${t('launch_failed')}: ${errorMsg}`;
            addLog({
                message: displayMsg,
                level: 'error',
                category: 'launch'
            });
        } finally {
            setIsLaunching(false);
        }
    };

    const handleAddAccount = () => {
        setEditingAccount(undefined);
        setIsAccountModalOpen(true);
        // Log not strictly necessary for "opening" add, but good for consistency if user wants "click" logs.
        // But usually we log "Actions". Opening a modal is a passive action.
        // However, user specifically asked for "Clicking Edit".
        addLog({ message: `打开添加账号窗口`, level: 'info' });
    };

    const handleEditAccount = (acc: Account) => {
        setEditingAccount(acc);
        setIsAccountModalOpen(true);
        addLog({ message: `编辑账号: ${acc.win_user}`, level: 'info' });
    };

    const handleDeleteAccount = async (id: string) => {
        const target = config.accounts.find(a => a.id === id);
        const newAccounts = config.accounts.filter(a => a.id !== id);
        const newConfig = { ...config, accounts: newAccounts };
        setConfig(newConfig);
        try {
            await saveConfig(newConfig);
            addLog({ message: `删除账号: ${target?.win_user || id}`, level: 'warn' });
        } catch (e) { console.error(e); }
    };

    const handleReorder = async (newAccounts: Account[]) => {
        const newConfig = { ...config, accounts: newAccounts };
        setConfig(newConfig);
        try {
            await saveConfig(newConfig);
        } catch (e) {
            console.error("Failed to save order", e);
        }
    };

    const handleViewModeChange = async (mode: 'card' | 'list') => {
        const newConfig = { ...config, dashboard_view_mode: mode };
        setConfig(newConfig);
        try {
            await saveConfig(newConfig);
        } catch (e) {
            console.error("Failed to save view mode", e);
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-zinc-950 text-gray-200 flex flex-col font-sans selection:bg-gold/30 selection:text-black">
            <div className="fixed inset-0 bg-[url('/bg-pattern.svg')] opacity-5 pointer-events-none"></div>


            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                config={config}
                onSave={setConfig}
            />
            <NotificationManager />


            <AccountModal
                // ...
                isOpen={isAccountModalOpen}
                onClose={() => setIsAccountModalOpen(false)}
                config={config}
                onSave={setConfig}
                editingAccount={editingAccount}
            />
            <DonateModal
                isOpen={isDonateOpen}
                onClose={() => setIsDonateOpen(false)}
            />

            <header className="h-16 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center px-6 justify-between shadow-xl">
                <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                        <span className="font-bold text-lg text-white tracking-tight leading-none">D2R <span className="text-zinc-500 font-normal">Multi</span></span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <ShieldCheck
                                size={10}
                                className={cn(
                                    isAdmin ? "text-emerald-500" : "text-zinc-600"
                                )}
                            />
                            <span className={cn("text-[10px] font-medium tracking-wide uppercase", isAdmin ? "text-emerald-500/80" : "text-zinc-600")}>
                                {isAdmin ? t('admin_mode') : t('user_mode')}
                            </span>
                        </div>
                    </div>

                    <nav className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-lg border border-white/5">
                        <button
                            onClick={() => setCurrentView('dashboard')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm transition-all ${currentView === 'dashboard' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <LayoutGrid size={16} />
                            {t('dashboard')}
                        </button>
                        <button
                            onClick={() => setCurrentView('accounts')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm transition-all ${currentView === 'accounts' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Users size={16} />
                            {t('accounts')}
                        </button>
                        <button
                            onClick={() => setCurrentView('manual')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm transition-all ${currentView === 'manual' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Wrench size={16} />
                            {t('manual')}
                        </button>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Globe size={14} className="text-zinc-500" />
                        <select
                            className="bg-transparent text-xs text-zinc-400 outline-none cursor-pointer hover:text-zinc-200"
                            value={i18n.language}
                            onChange={(e) => changeLanguage(e.target.value)}
                        >
                            <option value="zh-CN">ZH</option>
                            <option value="en">EN</option>
                        </select>
                    </div>

                    <button
                        onClick={() => setIsDonateOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gold/20 text-gold-light hover:bg-gold/30 transition-all border border-gold/40 hover:border-gold shadow-glow-gold animate-glow-pulse"
                    >
                        <Heart size={14} fill="currentColor" className="text-gold" />
                        <span className="text-xs font-bold tracking-tight">{t('donate')}</span>
                    </button>

                    <button onClick={() => setIsSettingsOpen(true)} className="text-zinc-500 hover:text-gold transition-colors">
                        <Settings size={18} />
                    </button>
                </div>
            </header>

            <main className="flex-1 relative overflow-hidden min-h-0">
                {currentView === 'dashboard' && (
                    <Dashboard
                        accounts={config.accounts}
                        invalidAccountIds={invalidAccountIds}
                        selectedAccountId={selectedAccountId}
                        onSelectAccount={setSelectedAccountId}
                        onLaunch={handleLaunch}
                        isLaunching={isLaunching}
                        onReorder={handleReorder}
                        onEdit={handleEditAccount}
                        launchLogs={launchLogs}
                        onClearLogs={clearLogs}
                        viewMode={config.dashboard_view_mode || 'card'}
                        onViewModeChange={handleViewModeChange}
                    />
                )}
                {currentView === 'accounts' && (
                    <AccountManager
                        accounts={config.accounts}
                        invalidAccountIds={invalidAccountIds}
                        onAdd={handleAddAccount}
                        onEdit={handleEditAccount}
                        onDelete={handleDeleteAccount}
                    />
                )}
                {currentView === 'manual' && (
                    <ManualTools
                        accounts={config.accounts}
                        selectedAccountId={selectedAccountId}
                    />
                )}
            </main>

            <ToastContainer />
        </div>
    );
}

export default App;
