import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
};

const baseClass =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f10] disabled:cursor-not-allowed disabled:opacity-40';

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-500 text-neutral-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)] hover:bg-emerald-400 active:bg-emerald-500/90',
  secondary:
    'border border-neutral-700/70 bg-neutral-900/60 text-neutral-200 hover:border-neutral-600 hover:bg-neutral-800/80 hover:text-neutral-50 active:bg-neutral-800',
  ghost:
    'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-100 active:bg-neutral-800/70',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    iconLeft,
    iconRight,
    className = '',
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`${baseClass} ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        iconLeft
      )}
      {children}
      {!loading && iconRight}
    </button>
  );
});

export default Button;
