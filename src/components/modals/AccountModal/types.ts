import { Account, AppConfig } from "../../../lib/api";

export interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: AppConfig;
    onSave: (newConfig: AppConfig) => void;
    editingAccount?: Account;
}

export interface ClassAvatarConfig {
    label: string;
    src: string;
}
