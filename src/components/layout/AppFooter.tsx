import { ShieldCheck, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils";
import { VaultIssue } from "../../lib/api";

interface AppFooterProps {
    isAdmin: boolean;
    version: string;
    vaultHealthIssues?: VaultIssue[];
}

export function AppFooter({ isAdmin, version, vaultHealthIssues }: AppFooterProps) {
    const { t } = useTranslation();

    return (
        <footer className="statusbar">
            <div className="sb-item">
                <div className="sb-dot"></div>
                <span>{t('footer_runtime_ready')}</span>
            </div>

            {/* Vault Health Indicator */}
            <div className="sb-item group cursor-help"
                title={vaultHealthIssues && vaultHealthIssues.length > 0
                    ? vaultHealthIssues.map(i => `${i.win_user}: ${i.reason}`).join('\n')
                    : ''}>
                <ShieldCheck size={12} className={cn(
                    !vaultHealthIssues || vaultHealthIssues.length === 0
                        ? "text-ok" : "text-warn animate-pulse"
                )} />
                <span className="lbl">Vault:</span>
                <span className={cn(
                    "sb-tag",
                    !vaultHealthIssues || vaultHealthIssues.length === 0
                        ? "ok"
                        : ""
                )}>
                    {!vaultHealthIssues || vaultHealthIssues.length === 0
                        ? t('vault_health_ok')
                        : `${vaultHealthIssues.length}${t('vault_health_issues')}`}
                </span>
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
