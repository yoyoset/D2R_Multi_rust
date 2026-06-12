import Dashboard from "./components/views/Dashboard";
import AccountManager from "./components/views/AccountManager";
import ManualTools from "./components/views/ManualTools";
import SequencerMini from "./components/views/SequencerMini";
import { ToastContainer } from "./components/ui/Toast";
import { SnapshotReminder } from "./components/ui/SnapshotReminder";
import TitleBar from "./components/ui/TitleBar";
import { useAppCore } from "./hooks/useAppCore";
import { AppHeader } from "./components/layout/AppHeader";
import { AppFooter } from "./components/layout/AppFooter";
import { ModalRegistry } from "./components/layout/ModalRegistry";
import { getConfig } from "./lib/api";

declare const __APP_VERSION__: string;

function App() {
    const core = useAppCore();

    if (core.windowLabel === 'sequencer') {
        return (
            <>
                <SequencerMini />
                <ToastContainer />
            </>
        );
    }

    return (
        <div className="app-shell">
            <div className="app-bg"></div>

            <TitleBar />

            <ModalRegistry
                config={core.config}
                setConfig={core.setConfig}
                isSettingsOpen={core.isSettingsOpen}
                setIsSettingsOpen={core.setIsSettingsOpen}
                isAccountModalOpen={core.isAccountModalOpen}
                setIsAccountModalOpen={core.setIsAccountModalOpen}
                editingAccount={core.editingAccount}
                isGuideOpen={core.isGuideOpen}
                handleCloseGuide={core.handleCloseGuide}
                isDonateOpen={core.isDonateOpen}
                setIsDonateOpen={core.setIsDonateOpen}
                isWhatsNewOpen={core.isWhatsNewOpen}
                setIsWhatsNewOpen={core.setIsWhatsNewOpen}
                isMigrationModalOpen={core.isMigrationModalOpen}
                isEditSequenceModalOpen={core.isEditSequenceModalOpen}
                setIsEditSequenceModalOpen={core.setIsEditSequenceModalOpen}
                currentPresetIndex={core.currentPresetIndex}
                missingCredentialIds={core.missingCredentialIds}
                isInitSetupOpen={core.isInitSetupOpen}
                setIsInitSetupOpen={core.setIsInitSetupOpen}
                onMigrationComplete={async () => {
                    core.setIsMigrationModalOpen(false);
                    const cfg = await getConfig();
                    core.setConfig(cfg);
                }}
            />

            <AppHeader 
                isAdmin={core.isAdmin}
                currentView={core.currentView}
                setCurrentView={core.setCurrentView}
                setIsGuideOpen={core.setIsGuideOpen}
                setIsDonateOpen={core.setIsDonateOpen}
                setIsSettingsOpen={core.setIsSettingsOpen}
            />

            <div className="content">
                <div className="page">
                    {core.currentView === 'dashboard' && (
                        <>
                        <SnapshotReminder
                            dismissed={core.config.snapshot_reminder_dismissed}
                            onDismiss={core.handleDismissSnapshotReminder}
                            className="mb-3"
                        />
                        <Dashboard
                        config={core.config}
                        accounts={core.config.accounts}
                        invalidAccountIds={core.invalidAccountIds}
                        missingCredentialIds={core.missingCredentialIds}
                        selectedAccountId={core.selectedAccountId}
                        onSelectAccount={core.setSelectedAccountId}
                        onLaunch={core.handleLaunch}
                        isLaunching={core.isLaunching}
                        advancedLaunchMode={core.config.advanced_launch_mode}
                        onReorder={core.handleReorder}
                        onEdit={core.handleEditAccount}
                        launchLogs={core.launchLogs}
                        onClearLogs={core.clearLogs}
                        viewMode={core.config.dashboard_view_mode || 'card'}
                        onViewModeChange={core.handleViewModeChange}
                        onRefreshPaths={core.handleRefreshPaths}
                        onAuditVault={() => core.validateVault(true)}
                        isAuditingVault={core.isAuditingVault}
                        onSaveSnapshot={core.handleSaveSnapshot}
                        onEditSequencePreset={(index) => {
                            core.setCurrentPresetIndex(index);
                            core.setIsEditSequenceModalOpen(true);
                        }}
                    />
                        </>
                )}
                {core.currentView === 'accounts' && (
                    <>
                    <SnapshotReminder
                        dismissed={core.config.snapshot_reminder_dismissed}
                        onDismiss={core.handleDismissSnapshotReminder}
                        className="mb-3"
                    />
                    <AccountManager
                        accounts={core.config.accounts}
                        invalidAccountIds={core.invalidAccountIds}
                        missingCredentialIds={core.missingCredentialIds}
                        onAdd={core.handleAddAccount}
                        onEdit={core.handleEditAccount}
                        onDelete={core.handleDeleteAccount}
                        onRefreshPaths={core.handleRefreshPaths}
                    />
                    </>
                )}
                {core.currentView === 'manual' && (
                    <ManualTools
                        accounts={core.config.accounts}
                        selectedAccountId={core.selectedAccountId}
                    />
                    )}
                </div>
            </div>

            <AppFooter 
                isAdmin={core.isAdmin}
                version={__APP_VERSION__}
                vaultHealthIssues={core.vaultHealthIssues}
            />

            <ToastContainer />
        </div>
    );
}

export default App;
