import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { fixGamePermissions } from '../../lib/api';
import { Button } from '../ui/Button';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal';
import { ShieldAlert, FolderSearch, Check, HardDrive } from 'lucide-react';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { cn } from '../../lib/utils';

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

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setIsDone(false);
            setLogs([]);
        }
    }, [isOpen]);

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
            onLog(t('logs.permissions.fixing_start', { path: targetPath }), 'info');
            const res = await fixGamePermissions(targetPath);
            onLog(`? ${res}`, 'success');
            setIsDone(true);
        } catch (e) {
            const errorMsg = t('logs.permissions.error_prefix', { error: String(e) });
            onLog(`? ${errorMsg}`, 'error');
            setLogs(prev => [...prev, `? ${errorMsg}`]);
        } finally {
            setIsFixing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={isFixing ? () => { } : onClose}>
            <ModalContent className="max-w-xl border-white/10 bg-zinc-950 p-0 overflow-hidden shadow-2xl">
                <ModalHeader onClose={isFixing ? undefined : onClose}>
                    <ShieldAlert size={16} className="text-blue-500" />
                    {t('fix_permissions')}
                </ModalHeader>

                <ModalBody className="p-4 bg-zinc-950">
                    <div className="space-y-5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-tight leading-relaxed italic border-l-2 border-zinc-800 pl-3">
                            {t('fix_permissions_desc')}
                        </p>

                        {!isFixing && !isDone && (
                            <div className="space-y-1.5 flex flex-col">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">{t('game_path')}</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 flex gap-2 items-center bg-black/50 border border-white/5 rounded-sm px-3 h-8 transition-all group focus-within:border-blue-500/30">
                                        <HardDrive size={16} className="text-zinc-700 group-focus-within:text-blue-500/50" />
                                        <input
                                            className="flex-1 bg-transparent border-none text-[10px] text-zinc-300 outline-none placeholder:text-zinc-800 font-mono"
                                            value={targetPath}
                                            onChange={e => setTargetPath(e.target.value)}
                                            placeholder={t('example_game_path')}
                                        />
                                    </div>
                                    <Button variant="outline" size="sm" className="px-3 rounded-sm border-white/10 hover:bg-white/5" onClick={selectFolder}>
                                        <FolderSearch size={16} />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {(isFixing || logs.length > 0) && (
                            <div className="relative group border border-white/5 rounded-sm overflow-hidden bg-zinc-900/40">
                                <div className="flex items-center justify-between px-3 py-1 bg-zinc-900 border-b border-white/5">
                                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{t('logic_stream_output')}</span>
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500/30"></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500/30"></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30"></div>
                                    </div>
                                </div>
                                <div className="h-48 overflow-y-auto p-3 font-mono text-[10px] scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                                    {logs.map((log, i) => (
                                        <div key={i} className={cn(
                                            "flex gap-3 leading-tight",
                                            log.includes('ERR:') || log.includes('?') ? 'text-rose-400' : 'text-zinc-500'
                                        )}>
                                            <span className="text-zinc-800 shrink-0 select-none">{i.toString().padStart(3, '0')}</span>
                                            <span className="truncate">{log}</span>
                                        </div>
                                    ))}
                                    {isFixing && (
                                        <div className="text-blue-500/50 animate-pulse ml-7">
                                            _
                                        </div>
                                    )}
                                    <div ref={logEndRef} />
                                </div>
                            </div>
                        )}
                    </div>
                </ModalBody>

                <ModalFooter className="p-3 border-t border-white/5 bg-zinc-900/50 flex justify-end gap-2">
                    {!isDone ? (
                        <>
                            <Button
                                variant="ghost"
                                className="h-8 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white rounded-sm border border-transparent hover:border-white/5"
                                onClick={onClose}
                                disabled={isFixing}
                            >
                                {t('cancel')}
                            </Button>
                            <Button
                                variant="solid"
                                isLoading={isFixing}
                                disabled={!targetPath}
                                className="h-8 px-8 bg-blue-600/10 border border-blue-600/30 text-blue-500 hover:bg-blue-600/20 font-black text-[10px] uppercase tracking-[0.2em] rounded-sm"
                                onClick={handleFixPermissions}
                            >
                                {isFixing ? t('processing') : t('start_fix')}
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="solid"
                            className="h-8 px-12 bg-emerald-600/10 border border-emerald-600/30 text-emerald-500 hover:bg-emerald-600/20 font-black text-[10px] uppercase tracking-[0.2em] rounded-sm"
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
