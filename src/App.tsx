import { useState, useEffect } from "react";
import { getConfig, launchGame, saveConfig, AppConfig, Account } from "./lib/api";
import { Settings, Globe, LayoutGrid, Users, Wrench } from "lucide-react";
import { SettingsModal } from "./components/modals/SettingsModal";
import { AccountModal } from "./components/modals/AccountModal";
import { useTranslation } from "react-i18next";
import Dashboard from "./components/views/Dashboard";
import AccountManager from "./components/views/AccountManager";
import ManualTools from "./components/views/ManualTools";

type View = 'dashboard' | 'accounts' | 'manual';

function App() {
  const { t, i18n } = useTranslation();
  const [config, setConfig] = useState<AppConfig>({ accounts: [] });

  const loadConfig = async () => {
    try {
      const cfg = await getConfig();
      setConfig(cfg);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const [currentView, setCurrentView] = useState<View>('dashboard');

  // Dashboard State
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
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
      alert(`Launch failed: ${e}`);
    } finally {
      setIsLaunching(false);
    }
  };

  const handleAddAccount = () => {
    setEditingAccount(undefined);
    setIsAccountModalOpen(true);
  };

  const handleEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setIsAccountModalOpen(true);
  };

  const handleDeleteAccount = async (id: string) => {
    const newAccounts = config.accounts.filter(a => a.id !== id);
    const newConfig = { ...config, accounts: newAccounts };
    setConfig(newConfig);
    try {
      await saveConfig(newConfig);
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

  return (
    <div className="h-screen overflow-hidden bg-zinc-950 text-gray-200 flex flex-col font-sans selection:bg-gold/30 selection:text-black">
      <div className="fixed inset-0 bg-[url('/bg-pattern.svg')] opacity-5 pointer-events-none"></div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={setConfig}
      />
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        config={config}
        onSave={setConfig}
        editingAccount={editingAccount}
      />

      <header className="h-16 border-b border-white/5 bg-zinc-950 z-50 flex items-center px-6 justify-between shadow-xl">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-gradient-to-tr from-gold to-yellow-700 flex items-center justify-center shadow-glow-gold-sm">
              <span className="font-extrabold text-black text-xs">D2R</span>
            </div>
            <span className="font-bold text-lg text-white tracking-tight">D2R <span className="text-zinc-500 font-normal">Multi</span></span>
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

          <button onClick={() => setIsSettingsOpen(true)} className="text-zinc-500 hover:text-gold transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden min-h-0">
        {currentView === 'dashboard' && (
          <Dashboard
            accounts={config.accounts}
            selectedAccountId={selectedAccountId}
            onSelectAccount={setSelectedAccountId}
            onLaunch={handleLaunch}
            isLaunching={isLaunching}
            onReorder={handleReorder}
            onEdit={handleEditAccount}
          />
        )}
        {currentView === 'accounts' && (
          <AccountManager
            accounts={config.accounts}
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
    </div>
  );
}

export default App;
