import { forwardRef, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
};

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className = '', id, ...rest },
  ref,
) {
  const checkboxId = id || rest.name;
  return (
    <label
      htmlFor={checkboxId}
      className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-neutral-300 select-none transition hover:text-neutral-100"
    >
      <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          className={`peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded border border-neutral-700 bg-[#0f1113] outline-none transition checked:border-emerald-500 checked:bg-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f10] ${className}`}
          {...rest}
        />
        <Check
          size={11}
          strokeWidth={3}
          className="pointer-events-none relative text-neutral-950 opacity-0 transition peer-checked:opacity-100"
        />
      </span>
      {label}
    </label>
  );
});

export default Checkbox;
