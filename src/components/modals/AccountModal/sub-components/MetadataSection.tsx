import { useTranslation } from "react-i18next";

interface MetadataSectionProps {
    bnetAccount: string;
    setBnetAccount: (val: string) => void;
    note: string;
    setNote: (val: string) => void;
    gamePath?: string;
}

export function MetadataSection({ bnetAccount, setBnetAccount, note, setNote, gamePath }: MetadataSectionProps) {
    const { t } = useTranslation();

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

            {gamePath && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-500">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gold mb-1.5 flex justify-between">
                        <span>{t('captured_game_path')}</span>
                    </label>
                    <div 
                        className="w-full bg-bg/80 border border-gold/10 rounded-sm px-3 py-2 text-[10px] text-text-dim font-mono break-all leading-relaxed"
                    >
                        {gamePath}
                    </div>
                </div>
            )}
        </div>
    );
}
