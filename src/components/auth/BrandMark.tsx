type BrandMarkProps = {
  className?: string;
  showText?: boolean;
};

export default function BrandMark({ className, showText = true }: BrandMarkProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2.5">
        <svg
          aria-hidden="true"
          viewBox="0 0 40 40"
          className="h-9 w-9 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <polygon
            points="20,3 37,20 20,37 3,20"
            className="text-emerald-400"
            strokeLinejoin="round"
          />
          <polygon
            points="20,11 29,20 20,29 11,20"
            className="text-emerald-500/70"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="20" r="2.2" className="fill-emerald-400 stroke-none" />
          <line x1="20" y1="3" x2="20" y2="11" className="text-emerald-500/60" />
          <line x1="20" y1="29" x2="20" y2="37" className="text-emerald-500/60" />
          <line x1="3" y1="20" x2="11" y2="20" className="text-emerald-500/60" />
          <line x1="29" y1="20" x2="37" y2="20" className="text-emerald-500/60" />
        </svg>
        {showText && (
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight text-neutral-50">
              Monhang
            </span>
            <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.28em] text-emerald-400/80">
              Editor 3D
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
