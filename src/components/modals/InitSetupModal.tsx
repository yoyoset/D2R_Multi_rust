import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HardDrive, FolderOpen, Plus, RefreshCw } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalBody } from '../ui/Modal';
import { Button } from '../ui/Button';
import { openFolderDialog, setDataRoot, saveConfig, AppConfig } from '../../lib/api';

interface InitSetupModalProps {
    isOpen: boolean;
    onComplete: (config: AppConfig) => void;
}

export const InitSetupModal: React.FC<InitSetupModalProps> = ({ isOpen, onComplete }) => {
    const { t } = useTranslation();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRestartMode, setIsRestartMode] = useState(false);

    const handleCreateNew = async () => {
        setIsProcessing(true);
        try {
            const defaultConfig: AppConfig = {
                accounts: [],
                game_path: "",
                sequence_presets: [null, null, null, null, null],
                theme_color: '#3b82f6',
            };
            await saveConfig(defaultConfig);
            onComplete(defaultConfig);
        } catch (e) {
            console.error(e);
            alert(`Failed to initialize: ${e}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLoadExisting = async () => {
        const path = await openFolderDialog();
        if (!path) return;

        setIsProcessing(true);
        try {
            await setDataRoot(path);
            setIsRestartMode(true);
        } catch (e) {
            console.error(e);
            alert(`Failed to set path: ${e}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRestart = () => {
        window.location.reload(); // Simple way to "restart" frontend, or app.exit(0)
        // In Tauri, true restart requires relaunching the process.
        // For now, reload or exit.
    };

    return (
        <Modal isOpen={isOpen} onClose={() => {}}>
            <ModalContent className="max-w-[450px]">
                <ModalHeader>
                    <div className="flex items-center gap-2">
                        <HardDrive size={16} className="text-gold" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('init_setup_title')}</span>
                    </div>
                </ModalHeader>

                <ModalBody className="p-6 space-y-6">
                    {!isRestartMode ? (
                        <>
                            <div className="space-y-2 text-center">
                                <p className="text-[11px] text-zinc-400 leading-relaxed uppercase tracking-wider">
                                    {t('init_setup_desc')}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={handleCreateNew}
                                    disabled={isProcessing}
                                    className="group flex items-center gap-4 p-4 rounded-sm bg-surface/50 border border-line hover:border-gold/40 hover:bg-gold/5 transition-all text-left"
                                >
                                    <div className="w-10 h-10 rounded-sm bg-gold/10 flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
                                        <Plus size={24} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[12px] font-black uppercase tracking-widest text-zinc-200">{t('init_setup_create')}</span>
                                        <span className="text-[10px] text-text-dim uppercase tracking-tighter">START FRESH IN DEFAULT DIRECTORY</span>
                                    </div>
                                </button>

                                <button
                                    onClick={handleLoadExisting}
                                    disabled={isProcessing}
                                    className="group flex items-center gap-4 p-4 rounded-sm bg-surface/50 border border-line hover:border-emerald-500/40 hover:bg-player-500/5 transition-all text-left"
                                >
                                    <div className="w-10 h-10 rounded-sm bg-player-500/10 flex items-center justify-center text-player-500 group-hover:scale-110 transition-transform">
                                        <FolderOpen size={24} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[12px] font-black uppercase tracking-widest text-zinc-200">{t('init_setup_load')}</span>
                                        <span className="text-[10px] text-text-dim uppercase tracking-tighter">LINK TO PREVIOUS DATA FOLDER</span>
                                    </div>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-4 space-y-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-player-500/10 flex items-center justify-center text-player-500 animate-bounce">
                                <RefreshCw size={32} />
                            </div>
                            <p className="text-[12px] font-black text-player-400 uppercase tracking-[0.2em]">
                                {t('init_setup_restart_hint')}
                            </p>
                            <Button
                                onClick={handleRestart}
                                className="w-full h-10 bg-player-600 font-black text-[11px] uppercase tracking-widest mt-4"
                            >
                                {t('understand')}
                            </Button>
                        </div>
                    )}
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};
