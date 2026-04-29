import { useTranslation } from 'react-i18next';
import { ShieldAlert, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '../ui/Modal';

interface DiagnosticResult {
    status: 'Pass' | 'Fail' | 'Warning';
    name: string;
    message: string;
}

interface DiagnosticModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    results: DiagnosticResult[];
}

export default function DiagnosticModal({ isOpen, onClose, title, results }: DiagnosticModalProps) {
    const { t } = useTranslation();

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent className="max-w-lg border-white/10 bg-zinc-950 p-0 overflow-hidden shadow-2xl">
                <ModalHeader onClose={onClose}>
                    <ShieldCheck size={14} className="text-blue-500" />
                    {title}
                </ModalHeader>
                
                <ModalBody className="p-0 max-h-[60vh] overflow-y-auto custom-scrollbar bg-zinc-950">
                    <div className="p-3 space-y-1">
                        {results.length === 0 ? (
                            <div className="py-12 text-center space-y-3 opacity-20">
                                <ShieldAlert size={32} className="mx-auto" />
                                <p className="text-[10px] font-black uppercase tracking-widest italic">{t('no_diagnostics_data')}</p>
                            </div>
                        ) : (
                            results.map((res, idx) => (
                                <div key={idx} className={cn(
                                    "px-4 py-2.5 rounded-sm border flex items-start gap-4 transition-all duration-300",
                                    res.status === 'Pass' ? "bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10" :
                                    res.status === 'Fail' ? "bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10" :
                                    "bg-amber-500/5 border-amber-500/10 hover:bg-amber-500/10"
                                )}>
                                    <div className="mt-1 shrink-0">
                                        {res.status === 'Pass' ? <CheckCircle2 size={14} className="text-emerald-500" /> :
                                         res.status === 'Fail' ? <ShieldAlert size={14} className="text-rose-500" /> :
                                         <AlertTriangle size={14} className="text-amber-500" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center h-5 mb-1">
                                            <span className="font-black text-[9px] text-zinc-300 uppercase tracking-widest">{t(res.name)}</span>
                                             <span className={cn(
                                                 "text-[8px] font-black px-1.5 py-0.5 rounded-sm border-t border-white/5 uppercase shadow-inner",
                                                 res.status === 'Pass' ? "bg-emerald-500/20 text-emerald-400" :
                                                 res.status === 'Fail' ? "bg-rose-500/20 text-rose-400" :
                                                 "bg-amber-500/20 text-amber-400"
                                             )}>{res.status}</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-500 leading-normal font-mono uppercase tracking-tighter opacity-80">
                                            {res.message.startsWith('diag.msg') ? t(res.message) : res.message}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ModalBody>

                <ModalFooter className="p-3 border-t border-white/5 bg-zinc-900/50 flex justify-between items-center">
                    <div className="flex items-center gap-2 px-2 py-1 bg-zinc-950/50 border border-white/5 rounded-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest italic leading-none">{t('status_ready')}</span>
                    </div>
                    <Button 
                        variant="ghost" 
                        className="h-8 px-5 text-[10px] font-black uppercase tracking-widest rounded-sm border border-white/5 hover:bg-white/5" 
                        onClick={onClose}
                    >
                        {t('diag_close') || 'CLOSE LOG'}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
