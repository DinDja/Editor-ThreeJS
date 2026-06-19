'use client';

import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';

export default function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="grid">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center justify-between rounded-md px-1 py-1.5 text-left transition hover:bg-neutral-800/60"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
          {icon}
          {title}
        </span>
        <ChevronDown
          size={13}
          className={`text-neutral-500 transition ${open ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>
      {open && <div className="grid gap-4 px-1 pb-3">{children}</div>}
    </section>
  );
}
