import { FolderOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

export const GamePathSection = ({ gamePath }: { gamePath: string }) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-1.5 px-0.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-1.5 tracking-widest">
                <FolderOpen size={16} className="text-primary/60" />
                {t('game_exe_path')}
            </label>
            <div className="group relative">
                <div className="w-full bg-zinc-950/40 border border-white/5 rounded-sm px-3 py-2 text-[10px] text-zinc-400 font-mono break-all leading-relaxed transition-all group-hover:border-white/10 group-hover:bg-zinc-900/40">
                    {gamePath || t('game_path_auto_detected')}
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter italic">
                * {t('game_path_auto_hint')}
            </p>
        </div>
    );
};
