import React, { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Copy } from 'lucide-react';

const appWindow = getCurrentWindow();

const TitleBar: React.FC = () => {
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
            className="h-8 bg-zinc-950 border-b border-white/5 flex items-center justify-between select-none z-[100] w-full shrink-0 cursor-default relative"
            onDoubleClick={handleMaximize}
        >
            {/* Left Content (also draggable) */}
            <div className="flex items-center h-full pl-3 gap-2 pointer-events-none">
                <img src="/app-icon.png" alt="logo" className="w-4 h-4" />
                <span className="text-[10px] font-bold text-zinc-600 tracking-wider uppercase">D2R MULTI</span>
            </div>

            {/* Right Controls (Non-draggable) */}
            <div className="flex h-full shrink-0" onMouseDown={e => e.stopPropagation()}>
                <button
                    onClick={handleMinimize}
                    className="flex items-center justify-center w-11 h-full hover:bg-white/5 transition-colors text-zinc-500 hover:text-zinc-200"
                    title="Minimize"
                >
                    <Minus size={14} />
                </button>
                <button
                    onClick={handleMaximize}
                    className="flex items-center justify-center w-11 h-full hover:bg-white/5 transition-colors text-zinc-500 hover:text-zinc-200"
                    title={isMaximized ? "Restore" : "Maximize"}
                >
                    {isMaximized ? <Copy size={12} className="rotate-180" /> : <Square size={12} />}
                </button>
                <button
                    onClick={handleClose}
                    className="flex items-center justify-center w-11 h-full hover:bg-rose-600 transition-colors text-zinc-500 hover:text-white"
                    title="Close"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default TitleBar;
