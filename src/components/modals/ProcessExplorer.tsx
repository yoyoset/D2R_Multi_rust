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
    ShieldAlert,
    Terminal
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

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent className="max-w-5xl h-[85vh] flex flex-col border-white/10 bg-zinc-950 p-0 overflow-hidden shadow-2xl">
                <ModalHeader onClose={onClose}>
                    <Cpu size={16} className="text-blue-500" />
                    {t('process_explorer_title')}
                </ModalHeader>

                <ModalBody className="flex-1 overflow-hidden flex flex-row gap-0 p-0">
                    {/* Left Panel: Process Selection */}
                    <div className="w-[30%] flex flex-col border-r border-white/5 bg-zinc-900/10">
                        <div className="p-3 bg-zinc-950/40 border-b border-white/5 space-y-3">
                             <div className="flex items-center justify-between mb-1">
                                 <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">{t('processes')}</span>
                                <Button 
                                    variant="ghost" 
                                    className="h-5 px-2 text-[10px] font-black uppercase tracking-widest gap-1.5 opacity-60 hover:opacity-100 rounded-sm"
                                    onClick={refreshProcesses}
                                    disabled={isLoadingProcs}
                                >
                                    <RefreshCw size={16} className={isLoadingProcs ? "animate-spin" : ""} />
                                    {t('refresh')}
                                </Button>
                             </div>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700" size={16} />
                                 <input
                                    className="w-full bg-black/50 border border-white/5 rounded-sm pl-9 pr-3 h-8 text-[10px] text-zinc-300 focus:border-blue-500/30 outline-none transition-all placeholder:text-zinc-800 font-mono"
                                    placeholder={t('search_process_placeholder')}
                                    value={procSearch}
                                    onChange={e => setProcSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {filteredProcesses.map(p => (
                                <div
                                    key={p.pid}
                                    onClick={() => setSelectedPid(p.pid)}
                                    className={cn(
                                        "px-4 py-2.5 cursor-context-menu border-b border-white/[0.02] transition-all",
                                        selectedPid === p.pid
                                            ? "bg-blue-500/10 border-l-2 border-l-blue-500"
                                            : "hover:bg-white/[0.02] border-l-2 border-l-transparent"
                                    )}
                                >
                                    <div className="flex justify-between items-center mb-0.5">
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-tight truncate",
                                            selectedPid === p.pid ? "text-blue-400" : "text-zinc-400"
                                        )}>{p.name}</span>
                                        <span className="text-[10px] opacity-30 font-mono text-zinc-500">PID:{p.pid}</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-600 font-mono uppercase truncate opacity-60 tracking-tighter">{p.user}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel: Handle List */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950/40">
                        <div className="p-3 bg-zinc-950/80 border-b border-white/5 flex gap-4 items-end">
                            <div className="flex-1 space-y-2">
                                 <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1.5">{t('logic_pattern_matcher')}</label>
                                <div className="relative group">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700" size={16} />
                                     <input
                                         className="w-full bg-black/50 border border-white/5 rounded-sm pl-9 pr-3 h-8 text-[10px] text-zinc-300 focus:border-emerald-500/30 outline-none transition-all placeholder:text-zinc-800 font-mono"
                                         placeholder={t('search_handle_placeholder')}
                                        value={handleSearch}
                                        onChange={e => setHandleSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                className="h-8 px-3 rounded-sm border-white/10 hover:bg-white/5"
                                onClick={() => selectedPid && refreshHandles(selectedPid)}
                                disabled={isLoadingHandles || !selectedPid}
                            >
                                <RefreshCw size={16} className={isLoadingHandles ? "animate-spin" : ""} />
                            </Button>
                        </div>

                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Table Header */}
                            <div className="grid grid-cols-[1fr,120px,80px] px-4 py-2 bg-zinc-900/50 border-b border-white/5 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                                <div className="flex items-center gap-2">
                                    <Terminal size={16} className="opacity-50" />
                                    <span>{t('handle_name')}</span>
                                </div>
                                <span className="border-l border-white/5 pl-4">{t('type')}</span>
                                <span className="text-right">{t('ops')}</span>
                            </div>

                            {/* Table Body */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {filteredHandles.map(h => {
                                    const isD2RMatch = h.name.includes('DiabloII') || h.name.includes('Check For Other Instances');
                                    return (
                                        <div
                                            key={`${h.handle_value}-${h.name}`}
                                            className={cn(
                                                "grid grid-cols-[1fr,120px,80px] px-4 py-1.5 border-b border-white/[0.02] items-center text-[10px] group transition-all",
                                                isD2RMatch ? "bg-rose-500/5 hover:bg-rose-500/10" : "hover:bg-white/[0.01]"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 truncate">
                                                <Key size={16} className={cn(isD2RMatch ? "text-rose-500/70" : "text-zinc-700")} />
                                                <span className={cn(
                                                    "truncate font-mono tracking-tight", 
                                                    isD2RMatch ? "text-rose-400 font-black" : "text-zinc-500"
                                                )}>
                                                    {h.name || `<NULL_OBJECT>`}
                                                </span>
                                            </div>
                                            <span className="text-zinc-600 text-[10px] font-black uppercase tracking-tighter opacity-70 border-l border-white/5 pl-4">
                                                {h.type_name}
                                            </span>
                                            <div className="text-right">
                                                <button
                                                    onClick={() => handleCloseHandle(h.handle_value)}
                                                    className="inline-flex items-center justify-center p-1.5 rounded-sm text-rose-500 hover:bg-rose-w-500/20 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-rose-500/20"
                                                    title={t('force_close_handle')}
                                                >
                                                    <XCircle size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredHandles.length === 0 && !isLoadingHandles && (
                                    <div className="flex flex-col items-center justify-center h-full text-zinc-800 py-20 italic">
                                        <Terminal size={32} className="opacity-5 mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">{selectedPid ? 'No matching handles stream' : 'Awaiting process selection...'}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedPid && (
                            <div className="m-3 p-3 rounded-sm bg-orange-500/5 border border-orange-500/10 flex items-start gap-3">
                                <ShieldAlert size={16} className="text-orange-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-orange-400/80 leading-relaxed italic font-black uppercase tracking-tighter">
                                    {t('manual_explorer_safety_hint')}
                                </p>
                            </div>
                        )}
                    </div>
                </ModalBody>

                <ModalFooter className="p-3 border-t border-white/5 bg-zinc-950 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] px-2 italic">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            <span>{t('process_monitor')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                             <span>{t('io_subsystem')}</span>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        className="h-8 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-100 rounded-sm border border-white/5 hover:bg-white/5" 
                        onClick={onClose}
                    >
                        {t('terminate_scan') || 'CLOSE'}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ProcessExplorer;
