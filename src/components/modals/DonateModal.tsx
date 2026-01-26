import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
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
            <ModalContent className="max-w-2xl overflow-hidden relative">
                {/* Decorative background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -z-10 rounded-full" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 blur-[100px] -z-10 rounded-full" />

                <ModalHeader onClose={onClose}>
                    <div className="p-2 rounded-xl bg-primary/20 text-primary shadow-glow-primary border border-primary/30 -ml-2">
                        <Heart size={20} fill="currentColor" className="animate-pulse" />
                    </div>
                    <div className="flex flex-col">
                        <span className="leading-none">{t('donate_title')}</span>
                        <span className="text-[9px] opacity-50 tracking-widest mt-0.5 font-bold">{t('app_title')}</span>
                    </div>
                </ModalHeader>

                <ModalBody className="p-8 space-y-8">
                    {/* Blessing message (Standardized Profile Style) */}
                    <div className="relative p-7 rounded-3xl bg-zinc-900/40 border border-white/10 shadow-2xl flex items-center gap-8 text-left group overflow-hidden transition-all duration-300 hover:bg-zinc-900/60">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                        <div className="relative shrink-0 z-10">
                            <img
                                src={logoImg}
                                alt="Dev"
                                className="w-20 h-20 rounded-2xl border border-white/10 shadow-2xl opacity-90 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105 object-cover"
                            />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-[3px] border-zinc-950 shadow-glow-emerald" />
                        </div>

                        <div className="relative z-10 space-y-1">
                            <p className="text-zinc-100 font-bold text-xl leading-relaxed italic drop-shadow-md">
                                "{t('donate_blessing')}"
                            </p>
                            <p className="text-[10px] text-yellow-600/60 font-medium uppercase tracking-[0.2em]">Developer Message</p>
                        </div>
                    </div>

                    {/* QR Codes Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Alipay */}
                        <div className="flex flex-col items-center gap-4 group">
                            <div className="relative p-3 rounded-2xl bg-white/5 border border-white/5 group-hover:border-primary transition-all duration-500 group-hover:transform group-hover:scale-105 shadow-2xl group-hover:shadow-glow-primary">
                                <img src={alipayImg} alt="Alipay" className="w-40 h-40 rounded-lg filter grayscale-[0.2] group-hover:grayscale-0 transition-all" />
                                <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest group-hover:text-primary transition-colors">{t('donate_alipay')}</span>
                        </div>

                        {/* WeChat */}
                        <div className="flex flex-col items-center gap-4 group">
                            <div className="relative p-3 rounded-2xl bg-white/5 border border-white/5 group-hover:border-primary transition-all duration-500 group-hover:transform group-hover:scale-105 shadow-2xl group-hover:shadow-glow-primary">
                                <img src={wechatImg} alt="WeChat" className="w-40 h-40 rounded-lg filter grayscale-[0.2] group-hover:grayscale-0 transition-all" />
                                <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest group-hover:text-primary transition-colors">{t('donate_wechat')}</span>
                        </div>

                        {/* PayPal */}
                        <div className="flex flex-col items-center gap-4 group">
                            <div className="relative p-3 rounded-2xl bg-white/5 border border-white/5 group-hover:border-primary transition-all duration-500 group-hover:transform group-hover:scale-105 shadow-2xl group-hover:shadow-glow-primary">
                                <img src={paypalImg} alt="PayPal" className="w-40 h-40 rounded-lg filter grayscale-[0.2] group-hover:grayscale-0 transition-all" />
                                <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest group-hover:text-primary transition-colors">{t('donate_paypal')}</span>
                        </div>
                    </div>
                </ModalBody>

                <div className="p-4 text-center border-t border-white/5 bg-black/10">
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-[0.2em]">
                        Linear Style Edition • Developed with Passion
                    </p>
                </div>
            </ModalContent>
        </Modal>
    );
};

