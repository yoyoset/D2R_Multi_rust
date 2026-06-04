import { ShieldCheck, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { VaultIssue } from "../../lib/api";

interface AppFooterProps {
    isAdmin: boolean;
    version: string;
    // Kept for API compatibility (vault audit still runs); no longer shown in the status bar.
    vaultHealthIssues?: VaultIssue[];
}

export function AppFooter({ isAdmin, version }: AppFooterProps) {
    const { t } = useTranslation();

    return (
        <footer className="statusbar">
            <div className="sb-item">
                <div className="sb-dot"></div>
                <span>{t('footer_runtime_ready')}</span>
            </div>

            <div className="sb-right">
                <div className="sb-item">
                    <ShieldCheck size={12} className={cn(isAdmin ? "text-gold" : "text-text-faint")} />
                    <span className="lbl">{t('footer_security_level')}:</span>
                    <span className={cn(
                        "sb-tag",
                        isAdmin ? "root" : ""
                    )}>
                        {isAdmin ? t('footer_security_privileged') : t('footer_security_limited')}
                    </span>
                </div>

                <div className="sb-item">
                    <span className="sb-ver">{t('footer_build')}: v{version}</span>
                    <Activity size={12} />
                </div>
            </div>
        </footer>
    );
}
