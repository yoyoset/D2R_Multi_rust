import { useState, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from './Modal';
import { Button } from "./Button";
import { AlertTriangle, Info, CheckCircle2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBlockingNotification } from "../../store/useBlockingNotification";
import { cn } from "../../lib/utils";

const ICON_MAP = {
    info: <Info size={16} className="text-net-400" />,
    warning: <AlertTriangle size={16} className="text-amber-400" />,
    error: <XCircle size={16} className="text-danger-400" />,
    success: <CheckCircle2 size={16} className="text-player-400" />,
};

export function NotificationManager() {
    const { t } = useTranslation();
    const { isOpen, title, message, type, actions, confirmText, close } = useBlockingNotification();
    const [safetyInput, setSafetyInput] = useState("");

    useEffect(() => {
        if (!isOpen) {
            setSafetyInput("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isAuthorized = !confirmText || safetyInput === confirmText;

    return (
        <Modal isOpen={isOpen} onClose={close}>
            <ModalContent className="max-w-md border-zinc-800 bg-bg/95 backdrop-blur-xl">
                <ModalHeader onClose={close}>
                    <div className="flex items-center gap-3">
                        {ICON_MAP[type]}
                        <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <div className="text-zinc-400 leading-relaxed whitespace-pre-wrap text-[10px] font-mono uppercase italic">
                            {message.split(/(!!.*?!!)/g).map((part, i) => {
                                if (part.startsWith('!!') && part.endsWith('!!')) {
                                    return (
                                        <span key={i} className="text-danger-500 font-black">
                                            {part.slice(2, -2)}
                                        </span>
                                    );
                                }
                                return part;
                            })}
                        </div>

                        {confirmText && (
                            <div className="mt-4 p-4 border border-danger-500/10 bg-danger-500/5 rounded-sm space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                                <span className="text-[10px] text-danger-500/80 font-black uppercase tracking-tighter block mb-1">
                                    {t('confirm_authorization_required')}
                                </span>
                                <input
                                    autoFocus
                                    type="text"
                                    value={safetyInput}
                                    onChange={(e) => setSafetyInput(e.target.value)}
                                    placeholder={t('confirm_authorize_placeholder', { text: confirmText })}
                                    className="w-full bg-black/60 border border-line-2 rounded-sm px-3 py-2 text-[14px] text-text placeholder:text-zinc-700 outline-none focus:border-danger-500/50 transition-all font-mono"
                                />
                            </div>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <div className="flex gap-3 w-full justify-end">
                        {actions.map((action, index) => {
                            let btnVariant: any = 'solid';
                            const isHighRisk = action.variant === 'danger' || action.variant === 'primary' || action.variant === 'solid';
                            const isDisabled = isHighRisk && !isAuthorized;

                            if (action.variant === 'danger') {
                                btnVariant = 'danger';
                            } else if (action.variant === 'success') {
                                btnVariant = 'success';
                            } else if (action.variant === 'info') {
                                btnVariant = 'info';
                            } else if (action.variant === 'outline') {
                                btnVariant = 'outline';
                            }

                            return (
                                <Button
                                    key={index}
                                    variant={btnVariant as any}
                                    size="sm"
                                    disabled={isDisabled}
                                    className={cn("rounded-sm font-black uppercase tracking-widest text-[10px]")}
                                    onClick={async () => {
                                        try {
                                            await action.onClick();
                                        } catch (e) {
                                            console.error(e);
                                        }
                                        close();
                                    }}
                                >
                                    {action.label}
                                </Button>
                            );
                        })}
                    </div>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
