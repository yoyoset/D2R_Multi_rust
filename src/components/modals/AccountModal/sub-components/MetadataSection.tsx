import { useTranslation } from "react-i18next";
import { FolderOpen } from "lucide-react";
import { openFolderDialog } from "../../../../lib/api";

interface MetadataSectionProps {
    bnetAccount: string;
    setBnetAccount: (val: string) => void;
    note: string;
    setNote: (val: string) => void;
    gamePath?: string;
    baselinePath: string;
    setBaselinePath: (val: string) => void;
    strictBaseline: boolean;
    setStrictBaseline: (val: boolean) => void;
    isD2r: boolean;
    setIsD2r: (val: boolean) => void;
    snapshotPaths: string[];
    isNewAccount: boolean;
}

export function MetadataSection({ bnetAccount, setBnetAccount, note, setNote, gamePath, baselinePath, setBaselinePath, strictBaseline, setStrictBaseline, isD2r, setIsD2r, snapshotPaths, isNewAccount }: MetadataSectionProps) {
    const { t } = useTranslation();
    const suggestions = snapshotPaths.filter(p => p.toLowerCase() !== baselinePath.trim().toLowerCase().replace(/\\/g, '/').replace(/\/+$/, ''));

    const handleBrowse = async () => {
        try {
            const selected = await openFolderDialog();
            if (selected) setBaselinePath(selected);
        } catch (e) {
            console.error("Folder dialog failed", e);
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-1.5">
                        {t('bnet_account')}
                    </label>
                    <input
                        type="text"
                        value={bnetAccount}
                        onChange={(e) => setBnetAccount(e.target.value)}
                        className="w-full bg-black/50 border border-white/5 rounded-sm px-3 py-1.5 text-[10px] text-text focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/20 font-mono transition-all h-8"
                        placeholder={t('bnet_id_placeholder') || "Bnet ID..."}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-1.5">
                        {t('note')}
                    </label>
                    <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full bg-black/50 border border-white/5 rounded-sm px-3 py-1.5 text-[10px] text-text focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/20 transition-all font-mono h-8"
                        placeholder={t('note_placeholder') || "Note..."}
                    />
                </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={!isD2r}
                    onChange={(e) => setIsD2r(!e.target.checked)}
                    className="mt-0.5 accent-[rgb(var(--c-gold))]"
                />
                <span className="flex flex-col">
                    <span className="text-[10px] font-bold text-text">{t('account_type_non_d2r')}</span>
                    <span className="text-[9px] text-text-dim leading-relaxed">{t('account_type_non_d2r_hint')}</span>
                </span>
            </label>

            {isD2r && (
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gold mb-1.5">
                    {t('baseline_path')}{isNewAccount && <span className="text-danger-500 ml-1">*</span>}
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={baselinePath}
                        onChange={(e) => setBaselinePath(e.target.value)}
                        className="flex-1 bg-black/50 border border-gold/20 rounded-sm px-3 py-1.5 text-[10px] text-text focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/20 font-mono transition-all h-8"
                        placeholder="F:\..."
                        spellCheck={false}
                    />
                    <button
                        type="button"
                        onClick={handleBrowse}
                        className="h-8 px-3 flex items-center gap-1.5 rounded-sm bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-all text-[10px] font-bold shrink-0"
                    >
                        <FolderOpen size={12} />
                        {t('browse')}
                    </button>
                </div>
                {suggestions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[9px] uppercase font-bold text-text-dim">{t('baseline_from_snapshot')}:</span>
                        {suggestions.map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setBaselinePath(p)}
                                className="text-[9px] font-mono px-2 py-0.5 rounded-sm bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-all break-all text-left"
                                title={p}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                )}
                <p className="text-[9px] text-text-dim leading-relaxed">
                    * {t('baseline_path_hint')}
                </p>
                <label className="flex items-start gap-2 cursor-pointer select-none pt-1">
                    <input
                        type="checkbox"
                        checked={strictBaseline}
                        onChange={(e) => setStrictBaseline(e.target.checked)}
                        className="mt-0.5 accent-[rgb(var(--c-gold))]"
                    />
                    <span className="flex flex-col">
                        <span className="text-[10px] font-bold text-text">{t('strict_baseline')}</span>
                        <span className="text-[9px] text-text-dim leading-relaxed">{t('strict_baseline_hint')}</span>
                    </span>
                </label>
            </div>
            )}

            {gamePath && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-500">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-1.5 flex justify-between">
                        <span>{t('captured_game_path')}</span>
                    </label>
                    <div
                        className="w-full bg-bg/80 border border-white/5 rounded-sm px-3 py-2 text-[10px] text-text-dim font-mono break-all leading-relaxed"
                    >
                        {gamePath}
                    </div>
                </div>
            )}
        </div>
    );
}
