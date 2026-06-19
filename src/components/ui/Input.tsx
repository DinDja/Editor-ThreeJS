import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  wrapperClassName?: string;
};

const inputBaseClass =
  'w-full rounded-lg border border-neutral-800 bg-[#0f1113] text-sm text-neutral-100 placeholder:text-neutral-600 outline-none transition focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50';

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    iconLeft,
    iconRight,
    wrapperClassName = '',
    className = '',
    id,
    ...rest
  },
  ref,
) {
  const inputId = id || rest.name;
  const paddingLeft = iconLeft ? 'pl-10' : 'pl-3.5';
  const paddingRight = iconRight ? 'pr-10' : 'pr-3.5';
  const hasError = Boolean(error);

  return (
    <div className={`grid gap-2 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {iconLeft && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-neutral-500">
            {iconLeft}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={`${inputBaseClass} h-11 ${paddingLeft} ${paddingRight} ${
            hasError ? 'border-red-500/60 focus:border-red-500/70 focus:ring-red-500/20' : ''
          } ${className}`}
          {...rest}
        />
        {iconRight && (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center text-neutral-500">
            {iconRight}
          </span>
        )}
      </div>
      {hasError ? (
        <p id={`${inputId}-error`} className="text-[11px] text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-[11px] text-neutral-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export default Input;
