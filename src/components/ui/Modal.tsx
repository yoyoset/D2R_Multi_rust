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
            "relative bg-bg border border-line-2 rounded-sm w-full max-w-lg shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden flex flex-col max-h-[90vh]",
            className
        )} onClick={e => e.stopPropagation()}>
            {children}
        </div>
    );
};

export const ModalHeader = ({ children, onClose, className }: { children: React.ReactNode; onClose?: () => void; className?: string }) => {
    return (
        <div className={cn("flex items-center justify-between px-3 py-1.5 border-b border-line bg-surface/50 shrink-0", className)}>
            <div className="flex items-center gap-2 text-text-dim font-black uppercase tracking-widest text-[10px] truncate">
                {children}
            </div>
            {onClose && (
                <button onClick={onClose} className="text-text-dim hover:text-text transition-colors p-1 hover:bg-white/5 rounded-sm">
                    <X size={16} />
                </button>
            )}
        </div>
    );
};

export const ModalBody = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return (
        <div className={cn("p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800", className)}>
            {children}
        </div>
    );
};

export const ModalFooter = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return (
        <div className={cn("px-3 py-2 bg-bg border-t border-line flex justify-end gap-2 shrink-0", className)}>
            {children}
        </div>
    );
};
