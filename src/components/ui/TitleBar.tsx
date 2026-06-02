import React, { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useTranslation } from 'react-i18next';
import { Minus, Square, X, Copy } from 'lucide-react';

const appWindow = getCurrentWindow();

const TitleBar: React.FC = () => {
    const { t } = useTranslation();
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        const updateMaximized = async () => {
            const maximized = await appWindow.isMaximized();
            setIsMaximized(maximized);
        };

        const unlisten = appWindow.onResized(() => {
            updateMaximized();
        });

        updateMaximized();

        return () => {
            unlisten.then(f => f());
        };
    }, []);

    const handleMinimize = () => appWindow.minimize();
    const handleMaximize = async () => {
        await appWindow.toggleMaximize();
    };
    const handleClose = () => appWindow.close();

    return (
        <div
            data-tauri-drag-region
            className="titlebar"
            onDoubleClick={handleMaximize}
        >
            {/* Left Content (also draggable) */}
            <div className="tb-left">
                <div className="tb-seal">
                    <img src="/app-icon.png" alt="logo" className="w-5 h-5" />
                </div>
                <span className="tb-title">{t('app_name_short')}</span>
            </div>

            {/* Right Controls (Non-draggable) */}
            <div className="win-controls" onMouseDown={e => e.stopPropagation()}>
                <button
                    onClick={handleMinimize}
                    className="win-btn"
                    title={t('minimize')}
                >
                    <Minus size={16} />
                </button>
                <button
                    onClick={handleMaximize}
                    className="win-btn"
                    title={isMaximized ? t('restore') : t('maximize')}
                >
                    {isMaximized ? <Copy size={16} className="rotate-180" /> : <Square size={16} />}
                </button>
                <button
                    onClick={handleClose}
                    className="win-btn close"
                    title={t('close')}
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default TitleBar;
