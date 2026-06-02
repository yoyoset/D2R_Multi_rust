import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '../../lib/api';
import { Button } from '../ui/Button';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal';
import { FolderPlus, FolderSearch, Plus } from 'lucide-react';
import { open as openDialog } from '@tauri-apps/plugin-dialog';

interface MirrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLog: (msg: string) => void;
}

const MirrorModal: React.FC<MirrorModalProps> = ({ isOpen, onClose, onLog }) => {
    const { t } = useTranslation();
    const [mirrorSource, setMirrorSource] = useState('');
    const [mirrorDest, setMirrorDest] = useState('');
    const [mirrorName, setMirrorName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Reset state when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setMirrorName('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const selectFolder = async (setter: (path: string) => void) => {
        const selected = await openDialog({
            directory: true,
            multiple: false,
            title: t('mirror_selecting')
        });
        if (selected) {
            setter(selected as string);
        }
    };

    const handleCreateMirror = async () => {
        if (!mirrorSource || !mirrorDest || !mirrorName) {
            onLog(`? ${t('mirror_error_invalid')}`);
            return;
        }
        setIsCreating(true);
        try {
            onLog(`> create_mirror_junction (${mirrorName})...`);
            const res = await invoke('create_mirror_junction', {
                source: mirrorSource,
                destination: mirrorDest,
                name: mirrorName
            }) as string;
            onLog(`? ${res}`);
            setMirrorName('');
            onClose();
        } catch (e) {
            onLog(`? Error: ${e}`);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent>
                <ModalHeader onClose={onClose}>
                    <FolderPlus size={16} className="text-gold" />
                    {t('mirror_title')}
                </ModalHeader>

                <ModalBody>
                    <div className="space-y-5">
                        <p className="text-[14px] text-zinc-400 italic leading-relaxed">
                            {t('mirror_desc')}
                        </p>

                        <div className="space-y-4">
                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-1.5">{t('mirror_source')}</label>
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 bg-black/50 border border-line rounded-sm px-3 py-1.5 text-[10px] text-zinc-300 focus:border-gold/50 outline-none transition-all placeholder:text-text-faint font-mono h-8"
                                        value={mirrorSource}
                                        onChange={e => setMirrorSource(e.target.value)}
                                        placeholder={t('example_mirror_source')}
                                    />
                                    <Button variant="outline" size="sm" className="px-3 rounded-sm border-line-2 hover:bg-line/10" onClick={() => selectFolder(setMirrorSource)}>
                                        <FolderSearch size={16} />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-1.5">{t('mirror_dest')}</label>
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 bg-black/50 border border-line rounded-sm px-3 py-1.5 text-[10px] text-zinc-300 focus:border-gold/50 outline-none transition-all placeholder:text-text-faint font-mono h-8"
                                        value={mirrorDest}
                                        onChange={e => setMirrorDest(e.target.value)}
                                        placeholder={t('example_mirror_dest')}
                                    />
                                    <Button variant="outline" size="sm" className="px-3 rounded-sm border-line-2 hover:bg-line/10" onClick={() => selectFolder(setMirrorDest)}>
                                        <FolderSearch size={16} />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-1.5">{t('mirror_name')}</label>
                                <input
                                    className="w-full bg-black/50 border border-line rounded-sm px-3 py-1.5 text-[10px] text-zinc-300 focus:border-gold/50 outline-none transition-all placeholder:text-text-faint font-mono uppercase h-8"
                                    value={mirrorName}
                                    onChange={e => setMirrorName(e.target.value)}
                                    placeholder={t('example_mirror_name')}
                                />
                            </div>
                        </div>
                    </div>
                </ModalBody>

                <ModalFooter className="p-3 border-t border-line bg-surface/50">
                    <Button
                        variant="ghost"
                        className="text-[10px] font-black uppercase tracking-widest text-text-dim hover:text-text rounded-sm h-8"
                        onClick={onClose}
                    >
                        {t('cancel')}
                    </Button>
                    <Button
                        variant="solid"
                        isLoading={isCreating}
                        className="px-8 bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 font-black text-[10px] uppercase tracking-[0.2em] rounded-sm h-8"
                        onClick={handleCreateMirror}
                    >
                        <Plus size={16} className="mr-2" />
                        {t('mirror_btn_create')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default MirrorModal;
