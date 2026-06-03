import { Sparkles } from "lucide-react";
import { cn } from "../../../lib/utils";
import { ClassAvatar, CLASS_AVATARS } from "./ClassAvatar";
import { useTranslation } from "react-i18next";

interface AvatarPickerProps {
    avatar?: string;
    onSelect: (avatar: string) => void;
    previewAvatar: string | null;
    setPreviewAvatar: (avatar: string | null) => void;
}

export const AvatarPicker = ({ avatar, onSelect, previewAvatar, setPreviewAvatar }: AvatarPickerProps) => {
    const { t } = useTranslation();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                onSelect(result);
                setPreviewAvatar(result);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-3">
            <label className="text-[14px] font-medium text-text-dim">
                {t('avatar')}
            </label>
            <div className="flex flex-wrap gap-2 relative">
                {Object.keys(CLASS_AVATARS).map(cls => (
                    <button
                        key={cls}
                        type="button"
                        onMouseEnter={() => setPreviewAvatar(CLASS_AVATARS[cls].src)}
                        onMouseLeave={() => setPreviewAvatar(null)}
                        onClick={() => onSelect(cls)}
                        className={cn(
                            "relative transition-all duration-200 outline-none rounded-sm border",
                            avatar === cls ? "border-primary bg-primary/10" : "border-white/5 opacity-60 hover:opacity-100 hover:border-white/20"
                        )}
                    >
                        <ClassAvatar cls={cls} size="sm" />
                    </button>
                ))}
                <label
                    onMouseEnter={() => avatar?.startsWith('data:') && setPreviewAvatar(avatar)}
                    onMouseLeave={() => setPreviewAvatar(null)}
                    className={cn(
                        "w-7 h-7 rounded-sm border flex items-center justify-center cursor-pointer transition-all bg-surface",
                        avatar?.startsWith('data:') ? "border-primary text-primary" : "border-white/10 text-text-dim hover:text-text-dim hover:border-white/20"
                    )}
                >
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    <Sparkles size={16} />
                </label>

                {/* Preview Popup */}
                {previewAvatar && (
                    <div className="absolute bottom-full left-0 mb-2 p-1 bg-black border border-white/20 rounded-sm shadow-2xl z-[100] animate-in fade-in duration-100 pointer-events-none">
                        <img
                            src={previewAvatar}
                            alt="Preview"
                            className="w-24 h-24 object-cover rounded-sm border border-white/5"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
