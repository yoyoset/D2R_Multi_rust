import { Save, Zap } from "lucide-react";
import { Button } from "../../ui/Button";
import { useTranslation } from "react-i18next";
import { ModalFooter } from "../../ui/Modal";
import { cn } from "../../../lib/utils";

interface ModalFooterActionsProps {
    onClose: () => void;
    handleSave: (mode: 'save' | 'both') => void;
    isSaving: boolean;
    isEdit: boolean;
    isCreatingNew: boolean;
}

export const ModalFooterActions = ({ onClose, handleSave, isSaving, isEdit, isCreatingNew }: ModalFooterActionsProps) => {
    const { t } = useTranslation();

    return (
        <ModalFooter className="flex-row items-center justify-end gap-3 px-6 pb-4 pt-3 border-t border-white/5 bg-zinc-950/40 relative overflow-hidden group/footer">
            {/* Background Polish */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/2 translate-x-[-100%] group-hover/footer:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
            
            <Button
                variant="outline"
                className="text-zinc-500 h-9 px-5 border-white/5 hover:bg-zinc-800 hover:text-zinc-300 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all"
                onClick={onClose}
                disabled={isSaving}
            >
                {t('cancel')}
            </Button>
            
            <Button
                onClick={() => handleSave('both')}
                isLoading={isSaving}
                className={cn(
                    "h-9 px-8 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden border",
                    isCreatingNew 
                        ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        : "bg-blue-500/10 border-blue-500/50 text-blue-500 hover:bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                )}
            >
                <div className="flex items-center gap-2 relative z-10">
                    {isCreatingNew ? <Zap size={12} className="animate-pulse" /> : <Save size={12} />}
                    {isCreatingNew ? t('btn_create_now') : (isEdit ? t('save') : t('btn_save_config'))}
                </div>
                {/* Technical Scanline effect for primary button */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-[1px] w-full top-0 scanline opacity-20" />
            </Button>
        </ModalFooter>
    );
};
