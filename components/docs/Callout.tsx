import type { ReactNode } from 'react';

type CalloutType =
  | 'note'
  | 'tip'
  | 'important'
  | 'warning'
  | 'caution'
  | 'danger';

const styles: Record<
  CalloutType,
  { border: string; bg: string; icon: string; label: string }
> = {
  note: {
    border: 'border-blue-500/40',
    bg: 'bg-blue-500/5',
    icon: 'ℹ',
    label: 'Note',
  },
  tip: {
    border: 'border-green-500/40',
    bg: 'bg-green-500/5',
    icon: '💡',
    label: 'Tip',
  },
  important: {
    border: 'border-purple-500/40',
    bg: 'bg-purple-500/5',
    icon: '📌',
    label: 'Important',
  },
  warning: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/5',
    icon: '⚠️',
    label: 'Warning',
  },
  caution: {
    border: 'border-red-500/40',
    bg: 'bg-red-500/5',
    icon: '🔴',
    label: 'Caution',
  },
  danger: {
    border: 'border-red-600/40',
    bg: 'bg-red-600/5',
    icon: '🚫',
    label: 'Danger',
  },
};

export function Callout({
  type = 'note',
  children,
}: {
  type?: CalloutType;
  children: ReactNode;
}) {
  const style = styles[type] || styles.note;
  return (
    <div
      className={`${style.border} ${style.bg} border-l-4 rounded-r-lg px-4 py-3 my-4 not-prose`}
    >
      <p className="text-[12px] font-semibold uppercase tracking-wider text-[#999] light:text-[#6b7280] mb-1.5">
        {style.icon} {style.label}
      </p>
      <div className="text-[14px] text-[#b0b0b0] light:text-[#374151] leading-relaxed [&_p]:m-0 [&_p+p]:mt-2 [&_strong]:text-[#e7e7e7] light:[&_strong]:text-[#1a1a1a] [&_code]:text-[#e7e7e7] light:[&_code]:text-[#1a1a1a] [&_code]:bg-[#1a1a1a] light:[&_code]:bg-[#f3f4f6] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[13px]">
        {children}
      </div>
    </div>
  );
}
