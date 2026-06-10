import { useTranslation } from 'react-i18next';
import { ShieldAlert, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '../ui/Modal';

interface DiagnosticResult {
    // Backend (diag.rs) emits these i18n-key strings, not "Pass"/"Fail"/"Warning".
    status: 'status_pass' | 'status_fail' | 'status_warning';
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
            <ModalContent className="max-w-lg border-line-2 bg-bg p-0 overflow-hidden shadow-2xl">
                <ModalHeader onClose={onClose}>
                    <ShieldCheck size={14} className="text-net-500" />
                    {title}
                </ModalHeader>
                
                <ModalBody className="p-0 max-h-[60vh] overflow-y-auto custom-scrollbar bg-bg">
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
                                    res.status === 'status_pass' ? "bg-player-500/5 border-player/10 hover:bg-player-500/10" :
                                    res.status === 'status_fail' ? "bg-danger-500/5 border-danger-500/20 hover:bg-danger-500/10" :
                                    "bg-warn/5 border-warn/10 hover:bg-warn/10"
                                )}>
                                    <div className="mt-1 shrink-0">
                                        {res.status === 'status_pass' ? <CheckCircle2 size={14} className="text-player-500" /> :
                                         res.status === 'status_fail' ? <ShieldAlert size={14} className="text-danger-500" /> :
                                         <AlertTriangle size={14} className="text-warn" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center h-5 mb-1">
                                            <span className="font-black text-[9px] text-text-dim uppercase tracking-widest">{t(res.name)}</span>
                                             <span className={cn(
                                                 "text-[8px] font-black px-1.5 py-0.5 rounded-sm border-t border-line uppercase shadow-inner",
                                                 res.status === 'status_pass' ? "bg-player-500/20 text-player-400" :
                                                 res.status === 'status_fail' ? "bg-danger-500/20 text-danger-400" :
                                                 "bg-warn/20 text-warn"
                                             )}>{t(res.status)}</span>
                                        </div>
                                        <p className="text-[10px] text-text-dim leading-normal font-mono uppercase tracking-tighter opacity-80">
                                            {res.message.startsWith('diag.msg') ? t(res.message) : res.message}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ModalBody>

                <ModalFooter className="p-3 border-t border-line bg-surface/50 flex justify-between items-center">
                    <div className="flex items-center gap-2 px-2 py-1 bg-bg/50 border border-line rounded-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-net-500 animate-pulse"></div>
                        <span className="text-[8px] font-black text-text-dim uppercase tracking-widest italic leading-none">{t('status_ready')}</span>
                    </div>
                    <Button 
                        variant="ghost" 
                        className="h-8 px-5 text-[10px] font-black uppercase tracking-widest rounded-sm border border-line hover:bg-line/10" 
                        onClick={onClose}
                    >
                        {t('diag_close') || 'CLOSE LOG'}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
