import { useTranslation } from "react-i18next";
import { Coffee } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalBody } from '../ui/Modal';
import alipayImg from "../../assets/donate_alipay.png";
import wechatImg from "../../assets/donate_wechat.png";
import paypalImg from "../../assets/donate_paypal.png";
import logoImg from "../../assets/sulogo.jpg";

interface DonateModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function DonateModal({ isOpen, onClose }: DonateModalProps) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent className="max-w-xl overflow-hidden relative">
                <ModalHeader onClose={onClose}>
                    <Coffee size={14} className="text-primary" />
                    <div className="flex flex-col">
                        <span className="leading-none text-[10px] font-black uppercase tracking-tighter">{t('donate_title')}</span>
                        <span className="text-[8px] text-zinc-600 font-mono tracking-tighter mt-0.5 uppercase">{t('app_title')}</span>
                    </div>
                </ModalHeader>

                <ModalBody className="p-6 space-y-6">
                    {/* Blessing message (Friendly BMC Style) */}
                    <div className="relative p-6 rounded-md bg-white/5 border border-pink-500/20 flex flex-col items-center gap-4 text-center overflow-hidden group hover:bg-white/[0.08] transition-all duration-500">
                        {/* Soft Warm Background Bloom */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FF5F5F]/10 blur-[80px] rounded-full" />
                        
                        <div className="relative shrink-0">
                            <img
                                src={logoImg}
                                alt="Dev"
                                className="relative w-24 h-24 rounded-full border-4 border-[#FF5F5F]/20 object-cover shadow-xl group-hover:scale-105 transition-all duration-500"
                            />
                            <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#FF5F5F] rounded-full border-2 border-zinc-950 flex items-center justify-center shadow-lg">
                                <Coffee size={8} className="fill-white text-white" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-zinc-200 font-medium text-[14px] leading-relaxed italic max-w-md px-8 tracking-[0.05em]">
                                "{t('donate_blessing')}"
                            </p>
                        </div>
                    </div>

                    {/* QR Codes Grid */}
                    <div className="grid grid-cols-3 gap-6 pt-2">
                        {/* Alipay */}
                        <div className="flex flex-col items-center gap-3 group">
                            <div className="relative p-1.5 rounded-sm bg-zinc-900 border border-white/10 group-hover:border-rose-400/50 transition-all shadow-2xl group-hover:shadow-rose-400/10">
                                <img src={alipayImg} alt="Alipay" className="w-32 h-32 rounded-sm transition-all duration-300 group-hover:scale-[1.02]" />
                            </div>
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter group-hover:text-rose-400 transition-colors">{t('donate_alipay')}</span>
                        </div>

                        {/* WeChat */}
                        <div className="flex flex-col items-center gap-3 group">
                            <div className="relative p-1.5 rounded-sm bg-zinc-900 border border-white/10 group-hover:border-emerald-500/50 transition-all shadow-2xl group-hover:shadow-emerald-500/10">
                                <img src={wechatImg} alt="WeChat" className="w-32 h-32 rounded-sm transition-all duration-300 group-hover:scale-[1.02]" />
                            </div>
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter group-hover:text-emerald-500 transition-colors">{t('donate_wechat')}</span>
                        </div>

                        {/* PayPal */}
                        <div className="flex flex-col items-center gap-3 group">
                            <div className="relative p-1.5 rounded-sm bg-zinc-900 border border-white/10 group-hover:border-blue-500/50 transition-all shadow-2xl group-hover:shadow-blue-500/10">
                                <img src={paypalImg} alt="PayPal" className="w-32 h-32 rounded-sm transition-all duration-300 group-hover:scale-[1.02]" />
                            </div>
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter group-hover:text-blue-500 transition-colors">{t('donate_paypal')}</span>
                        </div>
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

