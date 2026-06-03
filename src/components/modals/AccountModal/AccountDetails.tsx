import { useTranslation } from "react-i18next";

interface AccountDetailsProps {
    bnetAccount: string;
    setBnetAccount: (v: string) => void;
    note: string;
    setNote: (v: string) => void;
}

export const AccountDetails = ({ bnetAccount, setBnetAccount, note, setNote }: AccountDetailsProps) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-dim uppercase px-1 tracking-tighter">
                        {t('bnet_account')}
                    </label>
                    <input
                        type="text"
                        value={bnetAccount}
                        onChange={(e) => setBnetAccount(e.target.value)}
                        className="w-full bg-surface border border-white/10 rounded-sm px-3 py-1.5 text-[10px] text-text focus:border-primary/50 focus:outline-none transition-all font-mono"
                        placeholder={t('bnet_id_placeholder')}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-text-dim uppercase px-1 tracking-tighter">
                        {t('note')}
                    </label>
                    <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full bg-surface border border-white/10 rounded-sm px-3 py-1.5 text-[10px] text-text focus:border-primary/50 focus:outline-none transition-all font-mono"
                        placeholder={t('note_placeholder')}
                    />
                </div>
            </div>
        </div>
    );
};
