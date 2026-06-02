import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Edit2, Layers, AlertCircle } from 'lucide-react';
import { AppConfig, startSequence } from '../../lib/api';
import { cn } from '../../lib/utils';
import { useBlockingNotification } from '../../store/useBlockingNotification';
import { invoke } from '@tauri-apps/api/core';

interface SequencePresetControlsProps {
    config: AppConfig;
    onEditPreset: (index: number) => void;
    isSequenceActive?: boolean;
}

export const SequencePresetControls: React.FC<SequencePresetControlsProps> = ({
    config,
    onEditPreset,
    isSequenceActive = false
}) => {
    const { t } = useTranslation();
    const { show: showBlocking } = useBlockingNotification();

    const handleStart = async (index: number) => {
        if (isSequenceActive) return;

        try {
            // 1. Safety Check (Global Process Probing)
            const isAnyRunning = await invoke<boolean>("check_active_processes");
            
            if (isAnyRunning) {
                showBlocking(
                    t('active_processes_found_title'),
                    t('active_processes_found_desc'),
                    [
                        {
                            label: t('cancel'),
                            variant: 'outline',
                            onClick: () => {}
                        },
                        {
                            label: t('clean_and_continue'),
                            variant: 'primary',
                            onClick: async () => {
                                try {
                                    await invoke("kill_processes");
                                    // Wait a tiny bit for processes to fully exit OS-side
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                    
                                    // Re-validate just before starting
                                    const currentPreset = config.sequence_presets?.[index];
                                    const stillHasMissing = currentPreset?.accounts.some(id => !config.accounts.find(a => a.id === id));
                                    if (stillHasMissing) {
                                        throw new Error(t('err_invalid_sequence_detected'));
                                    }

                                    await startSequence(index);
                                } catch (err) {
                                    console.error("Clean and start failed:", err);
                                }
                            }
                        }
                    ],
                    'warning'
                );
                return;
            }

            const preset = config.sequence_presets?.[index];
            if (!preset) return;

            const hasMissing = preset.accounts.some(id => !config.accounts.find(a => a.id === id));
            if (hasMissing) {
                showBlocking(
                    t('err_invalid_sequence_detected'),
                    t('err_invalid_sequence_desc'),
                    [
                        { label: t('cancel'), variant: 'outline', onClick: () => {} },
                        { label: t('edit_preset'), variant: 'primary', onClick: () => onEditPreset(index) }
                    ],
                    'error'
                );
                return;
            }

            // 2. Direct Start if clean
            await startSequence(index);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="preset-bar">
            <div className="preset-label">
                <Layers size={14} />
                <span>{t('sequence_presets')}</span>
            </div>

            <div className="preset-chips">
                {[0, 1, 2].map((index) => {
                    const preset = config.sequence_presets?.[index];
                    const accountCount = preset?.accounts?.length || 0;
                    const hasAccounts = accountCount > 0;
                    const hasMissing = hasAccounts && preset?.accounts.some(id => !config.accounts.find(a => a.id === id));

                    return (
                        <div
                            key={index}
                            className={cn(
                                "preset-chip",
                                !hasAccounts && "disabled",
                                hasMissing && "invalid"
                            )}
                        >
                            <button
                                onClick={() => handleStart(index)}
                                disabled={!hasAccounts || isSequenceActive}
                                className="pc-play"
                                title={hasAccounts ? t('start_sequence') : t('no_accounts_in_preset')}
                            >
                                <Play
                                    size={11}
                                    className={cn(
                                        hasAccounts ? (hasMissing ? "text-danger" : "text-player") : "text-text-dim"
                                    )}
                                    fill={hasAccounts ? "currentColor" : "none"}
                                />
                                <span className={cn(
                                    hasAccounts ? (hasMissing ? "text-danger" : "text-text") : "text-text-faint"
                                )}>
                                    P{index + 1}
                                </span>
                                {hasMissing && <AlertCircle size={12} className="text-danger ml-0.5" />}
                            </button>

                            <button
                                onClick={() => onEditPreset(index)}
                                className="pc-edit"
                                title={t('edit_preset')}
                            >
                                <Edit2 size={13} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
