import { Shield, AlertTriangle } from 'lucide-react';

type SecurityNoticeProps = {
  type?: 'info' | 'warning';
  title: string;
  children: React.ReactNode;
};

export default function SecurityNotice({ type = 'info', title, children }: SecurityNoticeProps) {
  const isWarning = type === 'warning';

  return (
    <div
      className={`rounded-xl border p-5 ${
        isWarning
          ? 'border-amber-500/20 bg-amber-500/5'
          : 'border-emerald-500/15 bg-emerald-500/5'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {isWarning ? (
            <AlertTriangle size={18} className="text-amber-400" />
          ) : (
            <Shield size={18} className="text-emerald-400" />
          )}
        </div>
        <div>
          <h4 className={`text-sm font-semibold ${isWarning ? 'text-amber-200' : 'text-emerald-200'}`}>
            {title}
          </h4>
          <div className="mt-1.5 text-sm leading-relaxed text-neutral-400">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
