import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    getProcessList,
    getProcessHandles,
    closeSpecificHandle,
    ProcessInfo,
    HandleInfo
} from '../../lib/api';
import { Button } from '../ui/Button';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal';
import {
    Search,
    Cpu,
    Key,
    XCircle,
    RefreshCw,
    Filter,
    ShieldAlert
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface ProcessExplorerProps {
    isOpen: boolean;
    onClose: () => void;
    onLog?: (msg: string, level?: 'info' | 'success' | 'error') => void;
}

const ProcessExplorer: React.FC<ProcessExplorerProps> = ({ isOpen, onClose, onLog }) => {
    const { t } = useTranslation();
    const [processes, setProcesses] = useState<ProcessInfo[]>([]);
    const [selectedPid, setSelectedPid] = useState<number | null>(null);
    const [handles, setHandles] = useState<HandleInfo[]>([]);
    const [procSearch, setProcSearch] = useState('d2r');
    const [handleSearch, setHandleSearch] = useState('DiabloII');
    const [isLoadingProcs, setIsLoadingProcs] = useState(false);
    const [isLoadingHandles, setIsLoadingHandles] = useState(false);

    const refreshProcesses = async () => {
        setIsLoadingProcs(true);
        try {
            const list = await getProcessList();
            setProcesses(list);

            // Auto-select first d2r process if search is d2r
            if (procSearch.toLowerCase() === 'd2r') {
                const d2r = list.find(p => p.name.toLowerCase().includes('d2r'));
                if (d2r && !selectedPid) {
                    setSelectedPid(d2r.pid);
                }
            }
        } catch (e) {
            onLog?.(`Error fetching processes: ${e}`, 'error');
        } finally {
            setIsLoadingProcs(false);
        }
    };

    const refreshHandles = async (pid: number) => {
        setIsLoadingHandles(true);
        try {
            const list = await getProcessHandles(pid);
            setHandles(list);
        } catch (e) {
            onLog?.(`Error fetching handles for PID ${pid}: ${e}`, 'error');
        } finally {
            setIsLoadingHandles(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            refreshProcesses();
        } else {
            setSelectedPid(null);
            setHandles([]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedPid) {
            refreshHandles(selectedPid);
        }
    }, [selectedPid]);

    const filteredProcesses = useMemo(() => {
        if (!procSearch) return processes;
        const s = procSearch.toLowerCase();
        return processes.filter(p =>
            p.name.toLowerCase().includes(s) ||
            p.pid.toString().includes(s) ||
            p.user.toLowerCase().includes(s)
        ).sort((a, b) => {
            // Priority to exact d2r.exe
            if (a.name.toLowerCase() === 'd2r.exe') return -1;
            if (b.name.toLowerCase() === 'd2r.exe') return 1;
            return 0;
        });
    }, [processes, procSearch]);

    const filteredHandles = useMemo(() => {
        if (!handleSearch) return handles;
        const s = handleSearch.toLowerCase();
        return handles.filter(h =>
            h.name.toLowerCase().includes(s) ||
            h.type_name.toLowerCase().includes(s)
        );
    }, [handles, handleSearch]);

    const handleCloseHandle = async (handleVal: number) => {
        if (!selectedPid) return;
        try {
            await closeSpecificHandle(selectedPid, handleVal);
            onLog?.(`${t('handle_closed_success')}: 0x${handleVal.toString(16)}`, 'success');
            refreshHandles(selectedPid);
        } catch (e) {
            onLog?.(`${t('handle_close_failed')}: ${e}`, 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent className="max-w-4xl h-[85vh] flex flex-col">
                <ModalHeader onClose={onClose}>
                    <Cpu size={16} />
                    {t('process_explorer_title')}
                </ModalHeader>

                <ModalBody className="flex-1 overflow-hidden flex flex-row gap-4 p-4">
                    {/* Left Panel: Process Selection */}
                    <div className="w-1/3 flex flex-col gap-3 border-r border-white/5 pr-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                            <input
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-300 focus:border-primary/50 outline-none transition-all"
                                placeholder={t('search_process_placeholder')}
                                value={procSearch}
                                onChange={e => setProcSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                            {filteredProcesses.map(p => (
                                <div
                                    key={p.pid}
                                    onClick={() => setSelectedPid(p.pid)}
                                    className={cn(
                                        "p-2.5 rounded-xl cursor-context-menu transition-all border",
                                        selectedPid === p.pid
                                            ? "bg-primary/20 border-primary/30 text-primary-light"
                                            : "hover:bg-white/5 border-transparent text-zinc-400"
                                    )}
                                >
                                    <div className="flex justify-between items-center mb-0.5">
                                        <span className="text-xs font-bold truncate max-w-[120px]">{p.name}</span>
                                        <span className="text-[10px] opacity-40 font-mono">PID: {p.pid}</span>
                                    </div>
                                    <div className="text-[10px] opacity-40 truncate">{p.user}</div>
                                </div>
                            ))}
                            {filteredProcesses.length === 0 && !isLoadingProcs && (
                                <div className="text-center py-10 text-[10px] text-zinc-600 italic">
                                    {t('no_process_found')}
                                </div>
                            )}
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-[10px] text-zinc-500"
                            onClick={refreshProcesses}
                            isLoading={isLoadingProcs}
                        >
                            <RefreshCw size={12} className="mr-2" /> {t('refresh_list')}
                        </Button>
                    </div>

                    {/* Right Panel: Handle List */}
                    <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-300 focus:border-primary/50 outline-none transition-all"
                                    placeholder={t('search_handle_placeholder')}
                                    value={handleSearch}
                                    onChange={e => setHandleSearch(e.target.value)}
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="px-3"
                                onClick={() => selectedPid && refreshHandles(selectedPid)}
                                isLoading={isLoadingHandles}
                            >
                                <RefreshCw size={14} />
                            </Button>
                        </div>

                        <div className="flex-1 border border-white/5 rounded-xl bg-black/20 overflow-hidden flex flex-col transition-all">
                            {/* Table Header */}
                            <div className="grid grid-cols-[1fr,150px,80px] px-4 py-2 bg-zinc-900/50 border-b border-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                <span>{t('handle_name')}</span>
                                <span>{t('handle_type')}</span>
                                <span className="text-right">{t('actions')}</span>
                            </div>

                            {/* Table Body */}
                            <div className="flex-1 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-zinc-800">
                                {filteredHandles.map(h => {
                                    const isD2RMatch = h.name.includes('DiabloII') || h.name.includes('Check For Other Instances');
                                    return (
                                        <div
                                            key={`${h.handle_value}-${h.name}`}
                                            className={cn(
                                                "grid grid-cols-[1fr,150px,80px] px-3 py-2 rounded-lg items-center text-[11px] group transition-colors",
                                                isD2RMatch ? "bg-rose-500/10 hover:bg-rose-500/20" : "hover:bg-white/5"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <Key size={12} className={cn(isD2RMatch ? "text-rose-400" : "text-zinc-600")} />
                                                <span className={cn("truncate font-mono", isD2RMatch ? "text-rose-300 font-bold" : "text-zinc-400")}>
                                                    {h.name || `<${t('unnamed_object')}>`}
                                                </span>
                                            </div>
                                            <span className="text-zinc-500 italic opacity-60 text-[10px]">{h.type_name}</span>
                                            <div className="text-right">
                                                <button
                                                    onClick={() => handleCloseHandle(h.handle_value)}
                                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/20 opacity-0 group-hover:opacity-100 transition-all"
                                                    title={t('force_close_handle')}
                                                >
                                                    <XCircle size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredHandles.length === 0 && !isLoadingHandles && (
                                    <div className="flex flex-col items-center justify-center h-full text-zinc-700 py-20">
                                        <Filter size={32} className="opacity-10 mb-4" />
                                        <p className="text-xs italic">{selectedPid ? t('no_handles_matching') : t('select_process_hint')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedPid && (
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
                                <ShieldAlert size={16} className="text-orange-500 shrink-0" />
                                <p className="text-[10px] text-orange-400/80 leading-relaxed italic">
                                    {t('manual_explorer_safety_hint')}
                                </p>
                            </div>
                        )}
                    </div>
                </ModalBody>

                <ModalFooter className="bg-zinc-950/50">
                    <div className="flex-1 flex items-center gap-2 text-[10px] text-zinc-600">
                        <span className="font-bold text-zinc-500 uppercase tracking-widest">{t('shortcuts')}:</span>
                        <span>{t('filter_d2r_hint')}</span>
                    </div>
                    <Button variant="ghost" className="text-zinc-500 hover:text-white" onClick={onClose}>
                        {t('close')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ProcessExplorer;
