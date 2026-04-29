import { cn } from "../../../lib/utils";

// Import Avatar Assets
import amaImg from "../../../assets/avatars/ama.png";
import sorImg from "../../../assets/avatars/sor.png";
import necImg from "../../../assets/avatars/nec.png";
import palImg from "../../../assets/avatars/pal.png";
import barImg from "../../../assets/avatars/bar.png";
import druImg from "../../../assets/avatars/dru.png";
import assImg from "../../../assets/avatars/ass.png";

export const CLASS_AVATARS: Record<string, { label: string; src: string }> = {
    'Ama': { label: 'Amazon', src: amaImg },
    'Sor': { label: 'Sorceress', src: sorImg },
    'Nec': { label: 'Necromancer', src: necImg },
    'Pal': { label: 'Paladin', src: palImg },
    'Bar': { label: 'Barbarian', src: barImg },
    'Dru': { label: 'Druid', src: druImg },
    'Ass': { label: 'Assassin', src: assImg },
};

export const ClassAvatar = ({ cls, size = "md", className }: { cls: string; size?: "sm" | "md" | "lg"; className?: string }) => {
    const config = CLASS_AVATARS[cls];
    if (!config) return null;

    const sizes = {
        sm: "w-7 h-7",
        md: "w-10 h-10",
        lg: "w-12 h-12"
    };

    return (
        <div className={cn(
            "rounded-sm border border-white/10 flex items-center justify-center overflow-hidden bg-zinc-950 relative group/avatar shrink-0",
            !className?.includes('w-') && sizes[size],
            className
        )}>
            <img
                src={config.src}
                alt={config.label}
                className="w-full h-full object-cover opacity-60 group-hover/avatar:opacity-100 transition-opacity"
            />
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        </div>
    );
};
