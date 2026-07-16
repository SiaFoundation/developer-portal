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
    border: 'border-[#76E6EB]/40',
    bg: 'bg-[#76E6EB]/5',
    icon: 'ℹ',
    label: 'Note',
  },
  tip: {
    border: 'border-[#36D955]/40',
    bg: 'bg-[#36D955]/5',
    icon: '💡',
    label: 'Tip',
  },
  important: {
    border: 'border-[#E50AAE]/40',
    bg: 'bg-[#E50AAE]/5',
    icon: '📌',
    label: 'Important',
  },
  warning: {
    border: 'border-[#C3E500]/40',
    bg: 'bg-[#C3E500]/5',
    icon: '⚠️',
    label: 'Warning',
  },
  caution: {
    border: 'border-[#FF7919]/40',
    bg: 'bg-[#FF7919]/5',
    icon: '🔴',
    label: 'Caution',
  },
  danger: {
    border: 'border-[#FF7919]/60',
    bg: 'bg-[#FF7919]/10',
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
      <p className="text-[12px] font-semibold uppercase tracking-wider text-[#999] light:text-[#374151] mb-1.5">
        {style.icon} {style.label}
      </p>
      <div className="text-[14px] text-[#b0b0b0] light:text-[#374151] leading-relaxed [&_p]:m-0 [&_p+p]:mt-2 [&_strong]:text-[#e7e7e7] light:[&_strong]:text-[#1a1a1a] [&_code]:text-[#e7e7e7] light:[&_code]:text-[#1a1a1a] [&_code]:bg-[#2d2d2d] light:[&_code]:bg-[#f3f4f6] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[13px]">
        {children}
      </div>
    </div>
  );
}
