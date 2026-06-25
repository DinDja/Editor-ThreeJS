export type ChangelogVersion = {
  version: string;
  date: string;
  type: 'feature' | 'fix' | 'improvement' | 'breaking';
  title: string;
  items: string[];
};

const typeBadge: Record<ChangelogVersion['type'], string> = {
  feature: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  fix: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  improvement: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  breaking: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const typeLabel: Record<ChangelogVersion['type'], string> = {
  feature: 'Novo',
  fix: 'Correcao',
  improvement: 'Melhoria',
  breaking: 'Breaking',
};

export default function ChangelogEntry({ version, date, type, title, items }: ChangelogVersion) {
  return (
    <div className="relative border-l border-neutral-800/60 pl-6 pb-10 last:pb-0">
      <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[#0d0f10] bg-emerald-500" />
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] ${typeBadge[type]}`}>
          {typeLabel[type]}
        </span>
        <span className="text-xs font-mono text-neutral-600">{version}</span>
        <span className="text-xs text-neutral-600">{date}</span>
      </div>
      <h3 className="text-sm font-semibold text-neutral-200">{title}</h3>
      <ul className="mt-2 space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-neutral-400 flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neutral-600" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
