import type { ReactNode } from 'react';

type LegalSectionProps = {
  title: string;
  children: ReactNode;
};

export default function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="text-lg font-semibold text-neutral-100">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-neutral-400 space-y-3">
        {children}
      </div>
    </section>
  );
}
