import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '../../lib/api';
import { Button } from '../ui/Button';
import { FolderPlus, FolderSearch, Plus, X } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

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

    if (!isOpen) return null;

    const selectFolder = async (setter: (path: string) => void) => {
        const selected = await open({
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
            onLog(`✖ ${t('mirror_error_invalid')}`);
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
            onLog(`✔ ${res}`);
            setMirrorName('');
            onClose();
        } catch (e) {
            onLog(`✖ Error: ${e}`);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-800/50">
                    <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-sm">
                        <FolderPlus size={16} />
                        {t('mirror_title')}
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <p className="text-xs text-zinc-400 italic leading-relaxed">
                        {t('mirror_desc')}
                    </p>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold px-1">{t('mirror_source')}</label>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-zinc-300 focus:border-primary/50 outline-none transition-all placeholder:text-zinc-700"
                                    value={mirrorSource}
                                    onChange={e => setMirrorSource(e.target.value)}
                                    placeholder="C:\Games\Diablo II Resurrected"
                                />
                                <Button variant="outline" size="sm" className="px-3 rounded-xl border-white/10" onClick={() => selectFolder(setMirrorSource)}>
                                    <FolderSearch size={14} />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold px-1">{t('mirror_dest')}</label>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-zinc-300 focus:border-primary/50 outline-none transition-all placeholder:text-zinc-700"
                                    value={mirrorDest}
                                    onChange={e => setMirrorDest(e.target.value)}
                                    placeholder="D:\Mirrors"
                                />
                                <Button variant="outline" size="sm" className="px-3 rounded-xl border-white/10" onClick={() => selectFolder(setMirrorDest)}>
                                    <FolderSearch size={14} />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 uppercase font-bold px-1">{t('mirror_name')}</label>
                            <input
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-zinc-300 focus:border-primary/50 outline-none transition-all placeholder:text-zinc-700"
                                value={mirrorName}
                                onChange={e => setMirrorName(e.target.value)}
                                placeholder="D2R_Client_1"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-zinc-950/50 border-t border-white/5 flex gap-3">
                    <Button
                        variant="ghost"
                        className="flex-1 text-zinc-500 hover:text-white"
                        onClick={onClose}
                    >
                        {t('cancel')}
                    </Button>
                    <Button
                        variant="solid"
                        isLoading={isCreating}
                        className="flex-2 px-8 bg-primary text-white font-bold tracking-widest"
                        onClick={handleCreateMirror}
                    >
                        <Plus size={16} className="mr-2" />
                        {t('mirror_btn_create')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default MirrorModal;
