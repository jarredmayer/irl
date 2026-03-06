interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'info';
}

export function Chip({
  label,
  selected = false,
  onClick,
  size = 'md',
  variant = 'default',
}: ChipProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-all btn-press whitespace-nowrap';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-full',
    md: 'px-4 py-2 text-[13px] rounded-full',
    lg: 'px-5 py-2.5 text-base rounded-full',
  };

  const variantClasses = {
    default: selected
      ? 'bg-ink text-white'
      : 'bg-white text-ink-3 border-[1.5px] border-divider hover:border-ink-3',
    outline: selected
      ? 'bg-ink text-white border border-ink'
      : 'bg-white text-ink-3 border-[1.5px] border-divider hover:border-ink-3',
    success: 'bg-[var(--color-teal)] text-white',
    warning: 'bg-[var(--color-ochre)] text-white',
    info: 'bg-[var(--color-slate)] text-white',
  };

  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`;

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {label}
      </button>
    );
  }

  return <span className={classes}>{label}</span>;
}

interface ChipGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function ChipGroup({ children, className = '' }: ChipGroupProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>{children}</div>
  );
}
