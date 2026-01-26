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
            "relative bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]",
            className
        )} onClick={e => e.stopPropagation()}>
            {children}
        </div>
    );
};

export const ModalHeader = ({ children, onClose, className }: { children: React.ReactNode; onClose?: () => void; className?: string }) => {
    return (
        <div className={cn("flex items-center justify-between p-4 border-b border-white/5 bg-white/5 backdrop-blur-md shrink-0", className)}>
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-sm">
                {children}
            </div>
            {onClose && (
                <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                    <X size={20} />
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
        <div className={cn("p-4 bg-black/20 border-t border-white/5 flex justify-end gap-3 shrink-0", className)}>
            {children}
        </div>
    );
};
