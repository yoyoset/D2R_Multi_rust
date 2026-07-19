import { UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Account, AppConfig } from "../../../lib/api";
import { Button } from "../../ui/Button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../../ui/Modal';

import { useAccountForm } from "./useAccountForm";
import { UserBindingSection } from "./sub-components/UserBindingSection";
import { PasswordSection } from "./sub-components/PasswordSection";
import { AvatarSection } from "./sub-components/AvatarSection";
import { MetadataSection } from "./sub-components/MetadataSection";
import { PolicySection } from "./sub-components/PolicySection";

export { ClassAvatar } from "./sub-components/AvatarSection";

interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: AppConfig;
    onSave: (newConfig: AppConfig) => void;
    editingAccount?: Account;
    missingCredentialIds: Set<string>;
}

export function AccountModal(props: AccountModalProps) {
    const { t } = useTranslation();
    const form = useAccountForm(props);

    if (!props.isOpen) return null;

    const isHost = form.winUser.toLowerCase() === form.currentUser.toLowerCase();

    return (
        <Modal isOpen={props.isOpen} onClose={props.onClose}>
            <ModalContent>
                <ModalHeader onClose={props.onClose}>
                    <UserRound size={16} />
                    {props.editingAccount ? `${t('edit_account')}: ${props.editingAccount.win_user}` : t('add_account')}
                </ModalHeader>

                <ModalBody>
                    <div className="space-y-4">
                        <UserBindingSection
                            editingAccount={!!props.editingAccount}
                            isManualInput={form.isManualInput}
                            setIsManualInput={form.setIsManualInput}
                            isCreatingNew={form.isCreatingNew}
                            setIsCreatingNew={form.setIsCreatingNew}
                            winUser={form.winUser}
                            setWinUser={form.setWinUser}
                            osUsers={form.osUsers}
                            isScanning={form.isScanning}
                            hasScannedDeep={form.hasScannedDeep}
                            handleDiscovery={form.handleDiscovery}
                            currentUser={form.currentUser}
                            existingAccounts={props.config.accounts}
                        />

                        {form.winUser && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <PasswordSection
                                    winPass={form.winPass}
                                    setWinPass={form.setWinPass}
                                    showPass={form.showPass}
                                    setShowPass={form.setShowPass}
                                    passwordError={form.passwordError}
                                    setPasswordError={() => {}} // Hook handles clearing error on change
                                    isValidatingPass={form.isValidatingPass}
                                    verifyWindowsPassword={form.verifyWindowsPassword}
                                    hasCredential={!!props.editingAccount && !props.missingCredentialIds.has(props.editingAccount.id)}
                                    isRequired={!props.editingAccount && !isHost}
                                />

                                <PolicySection
                                    applyPasswordPolicy={form.applyPasswordPolicy}
                                    setApplyPasswordPolicy={form.setApplyPasswordPolicy}
                                    skipConfigSync={form.skipConfigSync}
                                    setSkipConfigSync={form.setSkipConfigSync}
                                    isUnmanagedUser={form.isUnmanagedUser}
                                    winUser={form.winUser}
                                    isHost={isHost}
                                />
                            </div>
                        )}

                        <AvatarSection
                            avatar={form.avatar}
                            setAvatar={form.setAvatar}
                            previewAvatar={form.previewAvatar}
                            setPreviewAvatar={form.setPreviewAvatar}
                        />

                        <MetadataSection
                            bnetAccount={form.bnetAccount}
                            setBnetAccount={form.setBnetAccount}
                            note={form.note}
                            setNote={form.setNote}
                            gamePath={form.gamePath}
                            baselinePath={form.baselinePath}
                            setBaselinePath={form.setBaselinePath}
                            strictBaseline={form.strictBaseline}
                            setStrictBaseline={form.setStrictBaseline}
                            isD2r={form.isD2r}
                            setIsD2r={form.setIsD2r}
                            snapshotPaths={form.snapshotPaths}
                            isNewAccount={!props.editingAccount}
                        />
                    </div>
                </ModalBody>

                <ModalFooter>
                    <Button variant="ghost" size="sm" onClick={props.onClose} disabled={form.isSaving}>
                        {t('cancel')}
                    </Button>
                    <Button 
                        onClick={() => form.handleSave(false)} 
                        size="sm" 
                        isLoading={form.isSaving} 
                        variant={form.passwordError ? "danger" : "solid"} 
                        className="px-6"
                    >
                        {form.passwordError ? t('confirm_and_sync') : t('save')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
