import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertCircle, Download, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface GuideModalProps {
    isOpen: boolean;
    onClose: (dontShowAgain: boolean) => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const [dontShowAgain, setDontShowAgain] = useState(true);

    return (
        <Modal isOpen={isOpen} onClose={() => onClose(dontShowAgain)}>
            <ModalContent className="max-w-2xl">
                <ModalHeader onClose={() => onClose(dontShowAgain)}>
                    {t('user_guide_title') || '使用手册 & 环境要求'}
                </ModalHeader>
                
                <ModalBody className="space-y-6 text-zinc-300">
                    {/* ... (rest of the body content remains the same) */}
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-3 text-rose-400">
                            <AlertCircle size={20} />
                            <h3 className="font-bold text-base">{t('bnet_requirement_title') || '战网 (Battle.net) 安装要求'}</h3>
                        </div>
                        <div className="text-sm leading-relaxed">
                            {t('bnet_requirement_desc') || '本助手深度依赖 Windows 多用户隔离机制实现多开。为了确保权限模型的一致性，必须满足以下条件：'}
                        </div>
                        <ul className="list-disc list-inside text-xs space-y-2 ml-1 text-zinc-400">
                            <li>
                                <strong className="text-rose-300/80">{t('bnet_path_fixed') || '固定安装路径'}</strong>：必须安装在默认路径 <code className="bg-black/40 px-1 rounded text-rose-300">C:\Program Files (x86)\Battle.net</code>。
                            </li>
                            <li>
                                <strong className="text-rose-300/80">{t('bnet_all_users') || '全用户权限'}</strong>：安装战网时，必须勾选“为所有使用这台电脑的用户安装”。
                            </li>
                            <li>
                                <strong className="text-rose-300/80">{t('no_custom_path') || '不支持自定义'}</strong>：为了避免底层多用户环境下的权限混乱，战网程序本身不允许安装在非系统盘或其他自定义目录。
                            </li>
                        </ul>
                    </div>

                    {/* Game Path Section */}
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-3 text-emerald-400">
                            <CheckCircle2 size={20} />
                            <h3 className="font-bold text-base">{t('game_path_flex_title') || '游戏文件 (D2R) 路径'}</h3>
                        </div>
                        <p className="text-sm leading-relaxed">
                            {t('game_path_flex_desc') || '与战网程序不同，你的暗黑2游戏文件可以存放在任何地方（例如 D 盘或 E 盘）。你只需要在设置中正确指定其路径即可。'}
                        </p>
                    </div>

                    {/* Solution Section */}
                    <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 space-y-3">
                        <div className="flex items-center gap-3 text-zinc-100">
                            <Download size={20} />
                            <h3 className="font-bold text-base">{t('reinstall_hint_title') || '如何修复？'}</h3>
                        </div>
                        <p className="text-sm leading-relaxed">
                            {t('reinstall_hint_desc') || '如果你的战网已经安装在其他位置，请先卸载，然后重新下载战网安装程序，并保持默认设置安装。这不会影响你已经下载好的游戏内容。'}
                        </p>
                    </div>
                </ModalBody>

                <ModalFooter className="flex justify-between items-center">
                    <div 
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => setDontShowAgain(!dontShowAgain)}
                    >
                        <div className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                            dontShowAgain ? "bg-primary border-primary" : "border-zinc-600 group-hover:border-zinc-500"
                        )}>
                            {dontShowAgain && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                        <span className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
                            {t('dont_show_again')}
                        </span>
                    </div>

                    <Button variant="solid" onClick={() => onClose(dontShowAgain)} className="bg-primary text-white px-8">
                        {t('got_it') || '知道了'}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

