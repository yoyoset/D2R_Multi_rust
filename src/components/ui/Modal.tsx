import React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
    zIndex?: number;
}

export const Modal = ({ isOpen, onClose, children, className, zIndex = 100 }: ModalProps) => {
    if (!isOpen) return null;

    return (
        <div
            className={cn(
                "fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200",
                className
            )}
            style={{ zIndex }}
        >
            {/* Click outside to close (Optional, kept simple for now) */}
            <div className="absolute inset-0" onClick={onClose} />
            {children}
        </div>
    );
};

export const ModalContent = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return (
        <div className={cn(
            "relative bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden flex flex-col max-h-[90vh]",
            className
        )} onClick={e => e.stopPropagation()}>
            {children}
        </div>
    );
};

export const ModalHeader = ({ children, onClose, className }: { children: React.ReactNode; onClose?: () => void; className?: string }) => {
    return (
        <div className={cn("flex items-center justify-between p-4 border-b border-white/10 bg-white/5 backdrop-blur-md shrink-0", className)}>
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-sm drop-shadow-[0_0_8px_rgba(var(--color-primary),0.3)]">
                {children}
            </div>
            {onClose && (
                <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg">
                    <X size={18} />
                </button>
            )}
        </div>
    );
};

export const ModalBody = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return (
        <div className={cn("p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800", className)}>
            {children}
        </div>
    );
};

export const ModalFooter = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return (
        <div className={cn("p-4 bg-zinc-900/50 border-t border-white/10 flex justify-end gap-3 shrink-0 backdrop-blur-md", className)}>
            {children}
        </div>
    );
};
