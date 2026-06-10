import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SnapshotReminderProps {
    /**
     * - "banner": collapsible one-line callout. Expanding reveals the detail and
     *   a type-"yes" dismiss (deliberate friction so the message is read once).
     *   Dismissal is persisted via `onDismiss` and remembered everywhere.
     * - "note": same collapsible one-liner but no dismiss (contextual help in a
     *   modal).
     */
    variant?: 'banner' | 'note';
    /** Body text key override (defaults to the generic last-account reminder). */
    bodyKey?: string;
    /** banner only: whether it has already been dismissed (then renders nothing). */
    dismissed?: boolean;
    /** banner only: called when the user types "yes" and confirms. */
    onDismiss?: () => void;
    className?: string;
}

export function SnapshotReminder({
    variant = 'banner',
    bodyKey = 'snapshot_reminder_body',
    dismissed = false,
    onDismiss,
    className,
}: SnapshotReminderProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [val, setVal] = useState('');

    if (variant === 'banner' && dismissed) return null;

    const canClose = val.trim().toLowerCase() === 'yes';

    return (
        <div className={cn('rounded-sm border border-warn/25 bg-warn/[0.06]', className)}>
            {/* Collapsed one-liner — click to toggle */}
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left"
            >
                <AlertTriangle size={13} className="text-warn shrink-0" />
                <span className="flex-1 text-[11px] font-bold text-warn truncate">
                    {t('snapshot_reminder_title')}
                </span>
                <ChevronDown
                    size={13}
                    className={cn('text-warn/70 transition-transform shrink-0', open && 'rotate-180')}
                />
            </button>

            {/* Expanded detail */}
            {open && (
                <div className="px-3 pb-3 pl-8 space-y-2">
                    <p className="text-[11px] leading-relaxed text-text-dim">{t(bodyKey)}</p>
                    {variant === 'banner' && (
                        <div className="flex items-center gap-2 pt-0.5">
                            <span className="text-[10px] text-text-faint">
                                {t('snapshot_reminder_dismiss_hint')}
                            </span>
                            <input
                                value={val}
                                onChange={(e) => setVal(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && canClose) onDismiss?.(); }}
                                placeholder="yes"
                                spellCheck={false}
                                autoCorrect="off"
                                autoCapitalize="off"
                                className="w-16 bg-bg/60 border border-line-2 rounded-sm px-2 py-1 text-[11px] text-text outline-none focus:border-warn/50"
                            />
                            <button
                                type="button"
                                disabled={!canClose}
                                onClick={() => onDismiss?.()}
                                className={cn(
                                    'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-sm border transition-colors',
                                    canClose
                                        ? 'border-warn/40 text-warn hover:bg-warn/15 cursor-pointer'
                                        : 'border-line text-text-faint cursor-not-allowed opacity-50'
                                )}
                            >
                                {t('snapshot_reminder_close')}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
