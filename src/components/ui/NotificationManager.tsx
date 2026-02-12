
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from './Modal';
import { Button } from "./Button";
import { AlertTriangle, Info, CheckCircle2, XCircle } from "lucide-react";
import { useBlockingNotification } from "../../store/useBlockingNotification";

const ICON_MAP = {
    info: <Info size={24} className="text-blue-400" />,
    warning: <AlertTriangle size={24} className="text-amber-400" />,
    error: <XCircle size={24} className="text-rose-400" />,
    success: <CheckCircle2 size={24} className="text-emerald-400" />,
};

export function NotificationManager() {
    const { isOpen, title, message, type, actions, close } = useBlockingNotification();

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={close}>
            <ModalContent className="max-w-md border-zinc-800 bg-zinc-950/95 backdrop-blur-xl">
                <ModalHeader onClose={close}>
                    <div className="flex items-center gap-3">
                        {ICON_MAP[type]}
                        <span className="text-lg font-bold">{title}</span>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {message.split(/(!!.*?!!)/g).map((part, i) => {
                            if (part.startsWith('!!') && part.endsWith('!!')) {
                                return (
                                    <span key={i} className="text-rose-500 font-bold">
                                        {part.slice(2, -2)}
                                    </span>
                                );
                            }
                            return part;
                        })}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <div className="flex gap-3 w-full justify-end">
                        {actions.map((action, index) => {
                            let btnVariant: any = 'solid';
                            let customClass = '';

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
                                    variant={btnVariant}
                                    className={customClass}
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
