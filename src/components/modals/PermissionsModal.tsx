import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { fixGamePermissions } from '../../lib/api';
import { Button } from '../ui/Button';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal';
import { ShieldAlert, FolderSearch, Check, HardDrive } from 'lucide-react';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';

interface PermissionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLog: (msg: string, level: 'info' | 'success' | 'error') => void;
}

const PermissionsModal: React.FC<PermissionsModalProps> = ({ isOpen, onClose, onLog }) => {
    const { t } = useTranslation();
    const [targetPath, setTargetPath] = useState('');
    const [isFixing, setIsFixing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [isDone, setIsDone] = useState(false);
    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let unlisten: () => void;
        const setup = async () => {
            unlisten = await listen<string>('fix-permissions-log', (event) => {
                setLogs(prev => [...prev.slice(-100), event.payload]);
            });
        };
        setup();
        return () => { if (unlisten) unlisten(); };
    }, []);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [logs]);

    if (!isOpen) return null;

    const selectFolder = async () => {
        const selected = await openDialog({
            directory: true,
            multiple: false,
            title: t('fix_permissions')
        });
        if (selected) {
            setTargetPath(selected as string);
        }
    };

    const handleFixPermissions = async () => {
        if (!targetPath) {
            onLog(t('mirror_error_invalid'), 'error');
            return;
        }
        setIsFixing(true);
        setIsDone(false);
        setLogs([]);
        try {
            onLog(`> fix_game_permissions ("${targetPath}")...`, 'info');
            const res = await fixGamePermissions(targetPath);
            onLog(`✔ ${res}`, 'success');
            setIsDone(true);
        } catch (e) {
            onLog(`✖ Error: ${e}`, 'error');
            setLogs(prev => [...prev, `✖ Error: ${e}`]);
        } finally {
            setIsFixing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={isFixing ? () => { } : onClose}>
            <ModalContent className="max-w-xl">
                <ModalHeader onClose={isFixing ? undefined : onClose}>
                    <ShieldAlert size={16} className="text-blue-400" />
                    {t('fix_permissions')}
                </ModalHeader>

                <ModalBody>
                    <div className="space-y-5">
                        <p className="text-xs text-zinc-400 leading-relaxed">
                            {t('fix_permissions_desc')}
                        </p>

                        {!isFixing && !isDone && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-zinc-500 uppercase font-bold px-1">{t('game_path')}</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 flex gap-2 items-center bg-black/40 border border-white/10 rounded-xl px-4 py-2 transition-all group focus-within:border-blue-500/50">
                                        <HardDrive size={14} className="text-zinc-600 group-focus-within:text-blue-500/50" />
                                        <input
                                            className="flex-1 bg-transparent border-none text-xs text-zinc-300 outline-none placeholder:text-zinc-700"
                                            value={targetPath}
                                            onChange={e => setTargetPath(e.target.value)}
                                            placeholder="C:\Games\Diablo II Resurrected"
                                        />
                                    </div>
                                    <Button variant="outline" size="sm" className="px-3 rounded-xl border-white/10 hover:border-blue-500/30 text-zinc-400" onClick={selectFolder}>
                                        <FolderSearch size={14} />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {(isFixing || logs.length > 0) && (
                            <div className="relative group">
                                <div className="bg-black/80 border border-white/5 rounded-xl h-48 overflow-y-auto p-3 font-mono text-[10px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                    {logs.map((log, i) => (
                                        <div key={i} className={log.startsWith('ERR:') ? 'text-rose-400' : 'text-zinc-500'}>
                                            <span className="text-zinc-700 mr-2">[{i.toString().padStart(3, '0')}]</span>
                                            {log}
                                        </div>
                                    ))}
                                    {isFixing && (
                                        <div className="text-blue-400 animate-pulse">
                                            _
                                        </div>
                                    )}
                                    <div ref={logEndRef} />
                                </div>
                            </div>
                        )}
                    </div>
                </ModalBody>

                <ModalFooter>
                    {!isDone ? (
                        <>
                            <Button
                                variant="ghost"
                                className="text-zinc-500 hover:text-white"
                                onClick={onClose}
                                disabled={isFixing}
                            >
                                {t('cancel')}
                            </Button>
                            <Button
                                variant="solid"
                                isLoading={isFixing}
                                disabled={!targetPath}
                                className="px-8 bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-widest"
                                onClick={handleFixPermissions}
                            >
                                {isFixing ? t('processing') : t('start_fix')}
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="solid"
                            className="px-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold tracking-widest"
                            onClick={onClose}
                        >
                            <Check size={16} className="mr-2" />
                            {t('confirm')}
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default PermissionsModal;
