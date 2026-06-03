import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const LANGUAGES = [
    { code: 'zh-CN', label: '简体中文', short: 'ZH' },
    { code: 'zh-TW', label: '繁體中文', short: 'TW' },
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'ja', label: '日本語', short: 'JA' },
    { code: 'ko', label: '한국어', short: 'KO' },
];

export const LanguageSelector: React.FC = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (code: string) => {
        i18n.changeLanguage(code);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 transition-all text-text-dim hover:text-text"
            >
                <Globe size={16} />
                <span className="text-[10px] font-medium uppercase">{currentLang.short}</span>
                <ChevronDown size={16} className={cn("transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-1 w-32 bg-surface border border-line-2 rounded-sm shadow-2xl py-1 z-[210] animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                    {LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleSelect(lang.code)}
                            className={cn(
                                "w-full text-left px-3 py-2 text-[10px] transition-colors",
                                i18n.language === lang.code
                                    ? "bg-gold/20 text-gold font-bold"
                                    : "text-text-dim hover:bg-white/5 hover:text-text"
                            )}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
