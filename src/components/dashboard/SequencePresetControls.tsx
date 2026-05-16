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
        <div className="flex items-center gap-1 shrink-0">
            <div className="flex items-center gap-1 mr-1">
                <Layers size={16} className="text-zinc-600" />
                <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-500 whitespace-nowrap">
                    {t('sequence_presets')}
                </span>
            </div>
            
            <div className="flex items-center gap-1">
                {[0, 1, 2].map((index) => {
                    const preset = config.sequence_presets?.[index];
                    const accountCount = preset?.accounts?.length || 0;
                    const hasAccounts = accountCount > 0;
                    const hasMissing = hasAccounts && preset?.accounts.some(id => !config.accounts.find(a => a.id === id));
                    
                    return (
                        <div 
                            key={index}
                            className={cn(
                                "flex items-center bg-zinc-900 border border-white/5 rounded-sm p-0.5 overflow-hidden transition-all h-[24px]",
                                hasAccounts ? "hover:border-primary/30" : "opacity-40",
                                hasMissing && "border-rose-500/50 hover:border-rose-500 bg-rose-500/5"
                            )}
                        >
                            <button
                                onClick={() => handleStart(index)}
                                disabled={!hasAccounts || isSequenceActive}
                                className={cn(
                                    "flex items-center gap-1 px-1.5 py-0.5 rounded-sm transition-all text-[10px] font-black uppercase tracking-tight",
                                    hasAccounts 
                                        ? "text-zinc-200 hover:bg-primary/10" 
                                        : "text-zinc-600 cursor-not-allowed"
                                )}
                                title={hasAccounts ? t('start_sequence') : t('no_accounts_in_preset')}
                            >
                                <Play 
                                    size={11} 
                                    className={cn(hasAccounts ? (hasMissing ? "text-rose-500" : "text-primary") : "text-zinc-600")}
                                    fill={hasAccounts ? "currentColor" : "none"} 
                                />
                                <span className={hasAccounts ? (hasMissing ? "text-rose-400" : "text-zinc-200") : "text-zinc-600"}>P{index + 1}</span>
                                {hasMissing && <AlertCircle size={16} className="text-rose-500 ml-0.5" />}
                            </button>
                            
                            <button
                                onClick={() => onEditPreset(index)}
                                className="px-1 py-1 text-zinc-600 hover:text-zinc-300 transition-colors border-l border-white/5 ml-0.5 flex items-center justify-center"
                                title={t('edit_preset')}
                            >
                                <Edit2 size={16} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
