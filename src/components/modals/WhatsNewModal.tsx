import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Sparkles, ListChecks } from 'lucide-react';
import { getLatestChangelog } from '../../lib/api';

interface WhatsNewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [changelog, setChangelog] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            getLatestChangelog()
                .then(setChangelog)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent className="max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-amber-500 to-rose-500"></div>

                <ModalHeader onClose={onClose} className="border-b-0 pb-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Sparkles className="text-primary" size={24} />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-2xl font-black text-white tracking-tight">{t('whats_new_title') || "发现新特性"}</h2>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold opacity-60">D2R Multi Version Evolution</p>
                        </div>
                    </div>
                </ModalHeader>

                <ModalBody className="overflow-y-auto px-8 py-6 custom-scrollbar space-y-6">
                    {/* Detailed Changelog */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-zinc-100 font-bold border-b border-white/5 pb-2">
                            <ListChecks size={18} className="text-zinc-500" />
                            <span>{t('detailed_changelog') || "版本变动详情"}</span>
                        </div>

                        {loading ? (
                            <div className="h-40 flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <div className="prose prose-invert prose-sm max-w-none">
                                <pre className="whitespace-pre-wrap text-zinc-400 font-sans leading-relaxed text-[13px] bg-black/20 p-5 rounded-2xl border border-white/5 max-h-60 overflow-y-auto custom-scrollbar italic">
                                    {changelog}
                                </pre>
                            </div>
                        )}
                    </div>
                </ModalBody>

                <ModalFooter className="bg-zinc-900/30 border-t border-white/5">
                    <Button variant="solid" onClick={onClose} className="bg-primary hover:bg-primary/90 text-white font-black px-12 h-11 italic uppercase tracking-tighter rounded-full shadow-lg shadow-primary/20">
                        {t('explore_now') || "进入避难所"}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
