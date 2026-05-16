import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, Plus, Trash2, ChevronUp, ChevronDown, Save, AlertCircle } from 'lucide-react';
import { AppConfig, SequencePreset, saveSequencePreset } from '../../lib/api';
import { cn } from '../../lib/utils';

interface EditSequenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: AppConfig;
    presetIndex: number;
    onSave: (config: AppConfig) => void;
}

export const EditSequenceModal: React.FC<EditSequenceModalProps> = ({
    isOpen,
    onClose,
    config,
    presetIndex,
    onSave
}) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    useEffect(() => {
        if (isOpen) {
            const preset = config.sequence_presets[presetIndex];
            setSelectedIds(preset?.accounts || []);
        }
    }, [isOpen, presetIndex, config.sequence_presets]);

    const filteredAccounts = config.accounts.filter(a => 
        a.win_user.toLowerCase().includes(search.toLowerCase()) ||
        a.bnet_account.toLowerCase().includes(search.toLowerCase())
    );

    const handleAdd = (id: string) => {
        if (!selectedIds.includes(id)) {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleRemove = (id: string) => {
        setSelectedIds(selectedIds.filter(i => i !== id));
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newIds = [...selectedIds];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newIds.length) {
            [newIds[index], newIds[targetIndex]] = [newIds[targetIndex], newIds[index]];
            setSelectedIds(newIds);
        }
    };

    const handleSave = async () => {
        const preset: SequencePreset = {
            name: config.sequence_presets[presetIndex]?.name || `Preset ${presetIndex + 1}`,
            accounts: selectedIds
        };
        
        try {
            await saveSequencePreset(presetIndex, preset);
            const newPresets = [...config.sequence_presets];
            newPresets[presetIndex] = preset;
            onSave({ ...config, sequence_presets: newPresets });
            onClose();
        } catch (e) {
            console.error(e);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-zinc-950 border border-white/5 rounded-sm shadow-2xl flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <Save size={16} className="text-primary" />
                        <h2 className="text-[14px] font-black uppercase tracking-tight text-white">
                            {t('edit_sequence_preset')}: {config.sequence_presets[presetIndex]?.name || `Preset ${presetIndex + 1}`}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-sm transition-colors">
                        <X size={16} className="text-zinc-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 flex overflow-hidden">
                    {/* Left: Account Pool */}
                    <div className="flex-1 border-r border-white/5 flex flex-col">
                        <div className="p-3 border-b border-white/5 bg-zinc-900/20">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                                <input 
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t('search_accounts_placeholder')}
                                    className="w-full bg-zinc-900 border border-white/5 rounded-sm pl-9 pr-3 py-1.5 text-[10px] focus:outline-none focus:border-primary/50 transition-colors"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
                            {filteredAccounts.map(account => {
                                const isAdded = selectedIds.includes(account.id);
                                return (
                                    <div 
                                        key={account.id}
                                        className={cn(
                                            "flex items-center justify-between p-2 rounded-sm transition-all group",
                                            isAdded ? "bg-zinc-900/50 opacity-40 grayscale" : "bg-white/2 hover:bg-white/5 border border-transparent hover:border-white/5"
                                        )}
                                    >
                                        <div className="flex-1 flex items-center gap-3 overflow-hidden mr-2">
                                            <span className="text-[10px] font-bold text-zinc-200 shrink-0">{account.win_user}</span>
                                            <span className="text-[10px] text-zinc-500 font-mono tracking-tighter truncate max-w-[120px]">{account.bnet_account}</span>
                                            {account.note && (
                                                <span className="text-[10px] text-zinc-600 truncate italic">({account.note})</span>
                                            )}
                                        </div>
                                        {!isAdded && (
                                            <button 
                                                onClick={() => handleAdd(account.id)}
                                                className="p-1 px-2 rounded-sm bg-primary/10 text-primary hover:bg-primary/20 transition-all text-[10px] font-black uppercase"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Selected Sequence */}
                    <div className="flex-1 flex flex-col bg-zinc-950/40">
                        <div className="p-3 border-b border-white/5 bg-zinc-900/20 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-zinc-500 tracking-tighter">
                                {t('selected_queue')} ({selectedIds.length})
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
                            {selectedIds.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-zinc-700 opacity-20 italic text-[10px]">
                                    {t('empty_queue_hint')}
                                </div>
                            ) : (
                                selectedIds.map((id, index) => {
                                    const account = config.accounts.find(a => a.id === id);
                                    const isInvalid = !account;

                                    return (
                                        <div 
                                            key={`${id}-${index}`}
                                            className={cn(
                                                "flex items-center gap-2 p-2 border rounded-sm animate-in slide-in-from-right-4 duration-200 transition-all",
                                                isInvalid 
                                                    ? "bg-rose-500/10 border-rose-500/40 animate-pulse" 
                                                    : "bg-zinc-900/80 border-white/5"
                                            )}
                                        >
                                            <span className="text-[10px] font-mono text-zinc-600 w-4">{index + 1}.</span>
                                            <div className="flex-1 min-w-0 flex items-center gap-2">
                                                {isInvalid ? (
                                                    <>
                                                        <AlertCircle size={16} className="text-rose-500 shrink-0" />
                                                        <p className="text-[10px] font-bold text-rose-500 truncate italic">
                                                            {t('invalid_account_sequence')}
                                                        </p>
                                                        <span className="text-[10px] text-rose-500/40 font-mono">ID:{id.slice(0, 8)}</span>
                                                    </>
                                                ) : (
                                                    <p className="text-[10px] font-bold text-zinc-200 truncate">{account.win_user}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-0.5">
                                                <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="p-1 text-zinc-600 hover:text-zinc-300 disabled:opacity-0 transition-colors">
                                                    <ChevronUp size={16} />
                                                </button>
                                                <button onClick={() => handleMove(index, 'down')} disabled={index === selectedIds.length - 1} className="p-1 text-zinc-600 hover:text-zinc-300 disabled:opacity-0 transition-colors">
                                                    <ChevronDown size={16} />
                                                </button>
                                                <button onClick={() => handleRemove(id)} className="p-1 text-zinc-600 hover:text-red-400 transition-colors ml-1">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-zinc-900/50 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-tight text-zinc-400 hover:text-white transition-colors"
                    >
                        {t('cancel')}
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-6 py-1.5 rounded-sm bg-primary text-black text-[10px] font-black uppercase tracking-tight hover:bg-emerald-400 transition-all active:scale-95 shadow-lg shadow-primary/20"
                    >
                        {t('save_and_apply')}
                    </button>
                </div>
            </div>
        </div>
    );
};
