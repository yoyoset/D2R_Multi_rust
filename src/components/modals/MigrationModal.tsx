import React, { useEffect, useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody } from '../ui/Modal';
import { ShieldCheck, Loader2, Gauge, Zap } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import { useTranslation } from 'react-i18next';

interface MigrationModalProps {
    isOpen: boolean;
    onComplete: () => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({ isOpen, onComplete }) => {
    const { t } = useTranslation();
    const [progress, setProgress] = useState(0);
    const [currentStatus, setCurrentStatus] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const startMigration = async () => {
            try {
                // Listen for progress events from backend
                const unlisten = await listen<string>('migration-progress', (event) => {
                    setLogs(prev => [event.payload, ...prev].slice(0, 5));
                    setCurrentStatus(event.payload);
                    setProgress(prev => Math.min(prev + 5, 95)); // Simulated incremental progress
                });

                await invoke('run_migration');
                
                setProgress(100);
                setCurrentStatus(t('migration_success'));
                setIsFinished(true);
                
                // Keep the modal visible for a second to show completion
                setTimeout(() => {
                    onComplete();
                    unlisten();
                }, 1500);
            } catch (error) {
                console.error('Migration failed:', error);
                setCurrentStatus(`ERROR: ${error}`);
            }
        };

        startMigration();
    }, [isOpen, onComplete, t]);

    return (
        <Modal isOpen={isOpen} onClose={() => {}}>
            <ModalContent className="max-w-md border-primary/30 bg-black/95 shadow-[0_0_50px_-12px_rgba(var(--primary-rgb),0.2)]">
                <ModalHeader className="border-b border-white/5 bg-zinc-900/50">
                    <ShieldCheck size={16} className="text-primary mr-2" />
                    <span className="font-black text-[11px] uppercase tracking-[0.2em]">{t('migration_security_infra')}</span>
                </ModalHeader>
                
                <ModalBody className="p-4 space-y-4">
                    {/* Header Info */}
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Zap size={18} className="text-yellow-500 fill-yellow-500/20" />
                            {t('migration_vault_title')}
                        </h2>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            {t('migration_vault_desc')}
                        </p>
                    </div>

                    {/* Industrial Progress Bar */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end mb-1">
                            <div className="flex items-center gap-2">
                                <Gauge size={12} className="text-primary/60" />
                                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-tighter">{t('migration_encryption_progress')}</span>
                            </div>
                            <span className="text-lg font-mono text-primary font-bold">{progress}%</span>
                        </div>
                        
                        <div className="relative h-6 bg-zinc-900 border border-white/10 p-0.5 overflow-hidden">
                            {/* Scanning Stripes Background */}
                            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                                 style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff, #fff 1px, transparent 1px, transparent 10px)', backgroundSize: '20px 20px' }} 
                            />
                            
                            {/* The Bar */}
                            <div 
                                className="h-full bg-primary relative transition-all duration-300 ease-out shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
                                style={{ width: `${progress}%` }}
                            >
                                {/* Light Highlight */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                            </div>
                        </div>
                    </div>

                    {/* Status & Logs */}
                    <div className="space-y-3 bg-black/40 border border-white/5 p-4 rounded-sm">
                        <div className="flex items-center gap-3">
                            {isFinished ? (
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            ) : (
                                <Loader2 size={14} className="text-primary animate-spin" />
                            )}
                            <span className="text-xs font-mono text-zinc-300 truncate tracking-tight uppercase">
                                {currentStatus || t('migration_initializing')}
                            </span>
                        </div>

                        {/* Scrolling Log Mini-Consoloe */}
                        <div className="pt-2 border-t border-white/5 space-y-1">
                            {logs.map((log, i) => (
                                <div key={i} className="text-[9px] font-mono text-zinc-500 flex gap-2">
                                    <span className="text-zinc-700">[{new Date().toLocaleTimeString()}]</span>
                                    {log}
                                </div>
                            ))}
                            {logs.length === 0 && (
                                <div className="text-[9px] font-mono text-zinc-700 italic">{t('migration_waiting_telemetry')}</div>
                            )}
                        </div>
                    </div>

                    <div className="text-[9px] text-zinc-600 text-center uppercase tracking-widest leading-loose">
                        {t('migration_footer_note')}
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};
