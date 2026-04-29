import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertCircle, Download, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface GuideModalProps {
    isOpen: boolean;
    onClose: (dontShowAgain: boolean) => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [dontShowAgain, setDontShowAgain] = useState(true);

    return (
        <Modal isOpen={isOpen} onClose={() => onClose(dontShowAgain)}>
            <ModalContent className="max-w-2xl">
                <ModalHeader onClose={() => onClose(dontShowAgain)}>
                    <AlertCircle size={14} className="text-primary mr-2" />
                    {t('user_guide_title')}
                </ModalHeader>
                
                <ModalBody className="space-y-4 p-5 text-zinc-300">
                    {/* Bnet Requirement Section */}
                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-5 space-y-3">
                        <div className="flex items-center gap-2 text-rose-400">
                            <AlertCircle size={14} />
                            <h3 className="font-bold text-[11px] uppercase tracking-widest">{t('bnet_requirement_title')}</h3>
                        </div>
                        <p className="text-[13px] leading-relaxed text-zinc-400">
                            {t('bnet_requirement_desc')}
                        </p>
                        <div className="space-y-2.5 pt-1">
                            <div className="flex gap-2.5 text-[13px]">
                                <span className="text-rose-300/80 font-bold whitespace-nowrap">{t('bnet_path_fixed')}：</span>
                                <span className="text-zinc-400">{t('guide_bnet_path_desc')} <code className="bg-black/40 px-1.5 py-0.5 rounded text-rose-300 font-mono text-[11px]">C:\Program Files (x86)\Battle.net</code></span>
                            </div>
                            <div className="flex gap-2.5 text-[13px]">
                                <span className="text-rose-300/80 font-bold whitespace-nowrap">{t('bnet_all_users')}：</span>
                                <span className="text-zinc-400">{t('guide_bnet_install_all_users_desc')}</span>
                            </div>
                            <div className="flex gap-2.5 text-[13px]">
                                <span className="text-rose-300/80 font-bold whitespace-nowrap">{t('no_custom_path')}：</span>
                                <span className="text-zinc-400">{t('guide_bnet_path_reason_desc')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Game Path Section */}
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-5 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-400">
                            <CheckCircle2 size={14} />
                            <h3 className="font-bold text-[11px] uppercase tracking-widest">{t('game_path_flex_title')}</h3>
                        </div>
                        <p className="text-[13px] leading-relaxed text-zinc-400">
                            {t('game_path_flex_desc')}
                        </p>
                    </div>

                    {/* Launch Mode Section */}
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-5 space-y-4">
                        <div className="flex items-center gap-2 text-blue-400">
                            <AlertCircle size={14} />
                            <h3 className="font-bold text-[11px] uppercase tracking-widest">{t('guide_launch_modes_title')}</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1.5">
                                <h4 className="text-[12px] font-bold text-blue-300/90">{t('guide_launch_managed_title')}</h4>
                                <p className="text-[13px] text-zinc-400 leading-relaxed font-light">{t('guide_launch_managed_desc')}</p>
                            </div>
                            <div className="space-y-1.5">
                                <h4 className="text-[12px] font-bold text-blue-300/90">{t('guide_launch_advanced_title')}</h4>
                                <p className="text-[13px] text-zinc-400 leading-relaxed font-light">{t('guide_launch_advanced_desc')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Solution Section */}
                    <div className="bg-zinc-900/50 border border-white/5 rounded-lg p-5 space-y-2">
                        <div className="flex items-center gap-2 text-zinc-300">
                            <Download size={14} />
                            <h3 className="font-bold text-[11px] uppercase tracking-widest">{t('reinstall_hint_title')}</h3>
                        </div>
                        <p className="text-[13px] leading-relaxed text-zinc-500">
                            {t('reinstall_hint_desc')}
                        </p>
                    </div>
                </ModalBody>

                <ModalFooter className="flex justify-between items-center p-5">
                    <div 
                        className="flex items-center gap-3 cursor-pointer group unselectable"
                        onClick={() => setDontShowAgain(!dontShowAgain)}
                    >
                        <div className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center transition-all bg-zinc-900",
                            dontShowAgain ? "bg-primary border-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.3)]" : "border-zinc-700 group-hover:border-zinc-600"
                        )}>
                            {dontShowAgain && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                        <span className="text-[12px] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                            {t('dont_show_again')}
                        </span>
                    </div>

                    <Button variant="solid" onClick={() => onClose(dontShowAgain)} className="bg-primary text-white px-10 h-9 text-[13px] font-bold rounded-md shadow-lg shadow-primary/20">
                        {t('got_it')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

