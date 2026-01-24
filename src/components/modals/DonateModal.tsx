import { useTranslation } from "react-i18next";
import { Heart, X } from "lucide-react";
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="relative w-full max-w-2xl bg-zinc-950/90 border border-gold/20 rounded-3xl shadow-glow-gold-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Decorative background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 blur-[100px] -z-10 rounded-full" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold/5 blur-[100px] -z-10 rounded-full" />

                <div className="p-6 pb-2 flex justify-between items-center border-b border-white/5 bg-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gold/20 text-gold shadow-glow-gold-sm border border-gold/30">
                            <Heart size={24} fill="currentColor" className="animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight leading-tight">{t('donate_title')}</h2>
                            <p className="text-[10px] text-gold/60 font-bold uppercase tracking-[0.2em]">{t('app_title')}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-all duration-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-8 flex-1 overflow-y-auto">
                    {/* Blessing message */}
                    <div className="relative p-6 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-gold/20 text-center shadow-glow-gold-sm group overflow-hidden">
                        <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <img
                            src={logoImg}
                            alt="Logo"
                            className="absolute -top-3 -left-3 w-14 h-14 rounded-2xl border border-gold/40 shadow-glow-gold-sm opacity-60 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
                        />
                        <p className="text-gold-light font-bold text-lg leading-relaxed drop-shadow-md relative z-10">
                            "{t('donate_blessing')}"
                        </p>
                    </div>

                    {/* QR Codes Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Alipay */}
                        <div className="flex flex-col items-center gap-4 group">
                            <div className="relative p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:border-gold transition-all duration-500 group-hover:transform group-hover:scale-105 shadow-2xl group-hover:shadow-glow-gold">
                                <img src={alipayImg} alt="Alipay" className="w-40 h-40 rounded-lg filter grayscale-[0.2] group-hover:grayscale-0 transition-all" />
                                <div className="absolute inset-0 rounded-2xl bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest group-hover:text-gold transition-colors">{t('donate_alipay')}</span>
                        </div>

                        {/* WeChat */}
                        <div className="flex flex-col items-center gap-4 group">
                            <div className="relative p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:border-gold transition-all duration-500 group-hover:transform group-hover:scale-105 shadow-2xl group-hover:shadow-glow-gold">
                                <img src={wechatImg} alt="WeChat" className="w-40 h-40 rounded-lg filter grayscale-[0.2] group-hover:grayscale-0 transition-all" />
                                <div className="absolute inset-0 rounded-2xl bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest group-hover:text-gold transition-colors">{t('donate_wechat')}</span>
                        </div>

                        {/* PayPal */}
                        <div className="flex flex-col items-center gap-4 group">
                            <div className="relative p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:border-gold transition-all duration-500 group-hover:transform group-hover:scale-105 shadow-2xl group-hover:shadow-glow-gold">
                                <img src={paypalImg} alt="PayPal" className="w-40 h-40 rounded-lg filter grayscale-[0.2] group-hover:grayscale-0 transition-all" />
                                <div className="absolute inset-0 rounded-2xl bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest group-hover:text-gold transition-colors">{t('donate_paypal')}</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 text-center border-t border-white/5 bg-zinc-900/50">
                    <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-[0.2em]">
                        Imperial Gold Edition • Developed with Passion
                    </p>
                </div>
            </div>
        </div>
    );
}
