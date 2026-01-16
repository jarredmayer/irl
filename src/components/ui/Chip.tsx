interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
  variant?: 'default' | 'outline';
}

export function Chip({
  label,
  selected = false,
  onClick,
  size = 'md',
  variant = 'default',
}: ChipProps) {
  const baseClasses =
    'inline-flex items-center justify-center rounded-full font-medium transition-colors';

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  };

  const variantClasses = {
    default: selected
      ? 'bg-sky-500 text-white'
      : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    outline: selected
      ? 'border-2 border-sky-500 text-sky-600 bg-sky-50'
      : 'border border-slate-300 text-slate-600 hover:border-slate-400',
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
