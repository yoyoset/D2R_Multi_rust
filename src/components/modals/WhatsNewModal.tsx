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
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-warn to-danger"></div>

                <ModalHeader onClose={onClose}>
                    <div className="flex items-center gap-3">
                        <Sparkles className="text-gold" size={14} />
                        <div className="flex flex-col">
                            <h2 className="text-[10px] font-black text-text uppercase tracking-widest">{t('whats_new_title')}</h2>
                            <p className="text-[8px] text-text-dim font-mono uppercase tracking-tighter mt-0.5">{t('system_evolution_desc')}</p>
                        </div>
                    </div>
                </ModalHeader>

                <ModalBody className="overflow-y-auto p-4 custom-scrollbar space-y-4">
                    {/* Detailed Changelog */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-text-dim font-black text-[9px] uppercase tracking-widest border-b border-line pb-1.5">
                            <ListChecks size={12} className="text-text-dim" />
                            <span>{t('detailed_changelog')}</span>
                        </div>

                        {loading ? (
                            <div className="h-40 flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <div className="prose prose-invert prose-xs max-w-none">
                                <div className="whitespace-pre-wrap text-text-dim font-mono leading-relaxed text-[10px] bg-black/50 p-4 rounded-sm border border-line max-h-60 overflow-y-auto custom-scrollbar italic">
                                    {changelog}
                                </div>
                            </div>
                        )}
                    </div>
                </ModalBody>

                <ModalFooter className="bg-bg/50 border-t border-line">
                    <Button variant="solid" size="sm" onClick={onClose} className="bg-gold/80 hover:bg-gold text-text font-black px-8 rounded-sm uppercase tracking-widest">
                        {t('explore_now')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
