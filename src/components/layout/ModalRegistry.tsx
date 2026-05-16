import { SettingsModal } from "../modals/SettingsModal";
import { AccountModal } from "../modals/AccountModal";
import { DonateModal } from "../modals/DonateModal";
import { GuideModal } from "../modals/GuideModal";
import { MigrationModal } from "../modals/MigrationModal";
import { WhatsNewModal } from "../modals/WhatsNewModal";
import { EditSequenceModal } from "../modals/EditSequenceModal";
import { InitSetupModal } from "../modals/InitSetupModal";
import { NotificationManager } from "../ui/NotificationManager";
import { AppConfig, Account } from "../../lib/api";

interface ModalRegistryProps {
    config: AppConfig;
    setConfig: (config: AppConfig) => void;
    // Settings
    isSettingsOpen: boolean;
    setIsSettingsOpen: (val: boolean) => void;
    // Account
    isAccountModalOpen: boolean;
    setIsAccountModalOpen: (val: boolean) => void;
    editingAccount?: Account;
    // Info/Helper
    isGuideOpen: boolean;
    handleCloseGuide: (dontShowAgain?: boolean) => void;
    isDonateOpen: boolean;
    setIsDonateOpen: (val: boolean) => void;
    isWhatsNewOpen: boolean;
    setIsWhatsNewOpen: (val: boolean) => void;
    // Sequence
    isEditSequenceModalOpen: boolean;
    setIsEditSequenceModalOpen: (val: boolean) => void;
    currentPresetIndex: number;
    // Migration logic
    isMigrationModalOpen: boolean;
    onMigrationComplete: () => Promise<void>;
    missingCredentialIds: Set<string>;
    // Init Setup
    isInitSetupOpen: boolean;
    setIsInitSetupOpen: (val: boolean) => void;
}

export function ModalRegistry({
    config,
    setConfig,
    isSettingsOpen,
    setIsSettingsOpen,
    isAccountModalOpen,
    setIsAccountModalOpen,
    editingAccount,
    isGuideOpen,
    handleCloseGuide,
    isDonateOpen,
    setIsDonateOpen,
    isWhatsNewOpen,
    setIsWhatsNewOpen,
    isEditSequenceModalOpen,
    setIsEditSequenceModalOpen,
    currentPresetIndex,
    isMigrationModalOpen,
    onMigrationComplete,
    missingCredentialIds,
    isInitSetupOpen,
    setIsInitSetupOpen
}: ModalRegistryProps) {
    return (
        <>
            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                config={config}
                onSave={setConfig}
                onOpenWhatsNew={() => setIsWhatsNewOpen(true)}
            />
            <GuideModal
                isOpen={isGuideOpen}
                onClose={handleCloseGuide}
            />
            <WhatsNewModal
                isOpen={isWhatsNewOpen}
                onClose={() => setIsWhatsNewOpen(false)}
            />
            <MigrationModal
                isOpen={isMigrationModalOpen}
                onComplete={onMigrationComplete}
            />
            <AccountModal
                isOpen={isAccountModalOpen}
                onClose={() => setIsAccountModalOpen(false)}
                config={config}
                onSave={setConfig}
                editingAccount={editingAccount as any}
                missingCredentialIds={missingCredentialIds}
            />
            <DonateModal
                isOpen={isDonateOpen}
                onClose={() => setIsDonateOpen(false)}
            />
            <EditSequenceModal 
                isOpen={isEditSequenceModalOpen}
                onClose={() => setIsEditSequenceModalOpen(false)}
                config={config}
                presetIndex={currentPresetIndex}
                onSave={setConfig}
            />
            <InitSetupModal 
                isOpen={isInitSetupOpen}
                onComplete={(cfg) => {
                    setConfig(cfg);
                    setIsInitSetupOpen(false);
                }}
            />
            <NotificationManager />
        </>
    );
}
