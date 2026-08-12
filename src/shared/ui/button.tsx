import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClassNames: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover disabled:bg-border-strong',
  secondary:
    'border border-border-strong bg-surface text-foreground hover:bg-surface-hover disabled:text-muted-foreground',
  ghost: 'bg-transparent text-muted-foreground hover:bg-surface-hover hover:text-foreground',
  danger: 'bg-danger text-white hover:opacity-90',
};

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200 ease-out focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed ${variantClassNames[variant]} ${className}`}
      {...props}
    />
  );
}
