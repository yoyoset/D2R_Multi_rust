import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../../lib/utils";

// Import Avatar Assets
import amaImg from "../../../../assets/avatars/ama.png";
import sorImg from "../../../../assets/avatars/sor.png";
import necImg from "../../../../assets/avatars/nec.png";
import palImg from "../../../../assets/avatars/pal.png";
import barImg from "../../../../assets/avatars/bar.png";
import druImg from "../../../../assets/avatars/dru.png";
import assImg from "../../../../assets/avatars/ass.png";

export const CLASS_AVATARS: Record<string, { labelKey: string; src: string }> = {
    'Ama': { labelKey: 'char_ama', src: amaImg },
    'Sor': { labelKey: 'char_sor', src: sorImg },
    'Nec': { labelKey: 'char_nec', src: necImg },
    'Pal': { labelKey: 'char_pal', src: palImg },
    'Bar': { labelKey: 'char_bar', src: barImg },
    'Dru': { labelKey: 'char_dru', src: druImg },
    'Ass': { labelKey: 'char_ass', src: assImg },
};

export const ClassAvatar = ({ cls, size = "md", className }: { cls: string; size?: "sm" | "md" | "lg"; className?: string }) => {
    const { t } = useTranslation();
    const config = CLASS_AVATARS[cls];
    if (!config) return null;

    const sizes = {
        sm: "w-7 h-7",
        md: "w-10 h-10",
        lg: "w-12 h-12"
    };

    return (
        <div className={cn(
            "rounded-sm border border-white/10 flex items-center justify-center overflow-hidden bg-black relative group/avatar shrink-0",
            !className?.includes('w-') && sizes[size],
            className
        )}>
            <img
                src={config.src}
                alt={t(config.labelKey)}
                className="w-full h-full object-cover opacity-80 group-hover/avatar:opacity-100 transition-opacity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        </div>
    );
};

interface AvatarSectionProps {
    avatar: string | undefined;
    setAvatar: (avatar: string | undefined) => void;
    previewAvatar: string | null;
    setPreviewAvatar: (avatar: string | null) => void;
}

export function AvatarSection({ avatar, setAvatar, previewAvatar, setPreviewAvatar }: AvatarSectionProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-text-dim mb-1.5">
                {t('avatar')}
            </label>
            <div className="flex flex-wrap gap-2.5 relative">
                {Object.keys(CLASS_AVATARS).map(cls => (
                    <button
                        key={cls}
                        type="button"
                        onMouseEnter={() => setPreviewAvatar(CLASS_AVATARS[cls].src)}
                        onMouseLeave={() => setPreviewAvatar(null)}
                        onClick={() => setAvatar(cls)}
                        className={cn(
                            "relative transition-all duration-200 outline-none rounded-sm",
                            avatar === cls ? "ring-2 ring-primary ring-offset-2 ring-offset-zinc-900 scale-105 z-10" : "hover:scale-105 opacity-60 hover:opacity-100"
                        )}
                    >
                        <ClassAvatar cls={cls} size="sm" />
                    </button>
                ))}
                <label
                    onMouseEnter={() => avatar?.startsWith('data:') && setPreviewAvatar(avatar)}
                    onMouseLeave={() => setPreviewAvatar(null)}
                    className={cn(
                        "w-7 h-7 rounded-sm border flex items-center justify-center cursor-pointer transition-all bg-black/40 hover:bg-black/60",
                        avatar?.startsWith('data:') ? "border-primary text-primary" : "border-white/10 text-text-dim hover:text-text-dim"
                    )}
                >
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const result = reader.result as string;
                                setAvatar(result);
                                setPreviewAvatar(result);
                            };
                            reader.readAsDataURL(file);
                        }
                    }} />
                    <Sparkles size={16} />
                </label>

                {previewAvatar && (
                    <div className="absolute bottom-full left-0 mb-4 p-2 bg-surface border border-white/10 rounded-sm shadow-2xl z-[100] animate-in zoom-in-95 duration-200 pointer-events-none">
                        <img
                            src={previewAvatar}
                            alt={t('preview')}
                            className="w-32 h-32 object-cover rounded-sm border border-white/5"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
