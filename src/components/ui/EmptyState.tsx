interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="text-ink-3 mb-4 text-5xl">{icon}</div>
      )}
      <h3 className="font-serif text-xl text-ink mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-ink-2 max-w-xs mb-6">{description}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="px-5 py-2.5 bg-ink text-white rounded-full text-sm font-medium hover:bg-ink/90 transition-colors btn-press"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm text-ink-2">{message}</p>
    </div>
  );
}

export function ErrorState({
  message = 'Something went wrong',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={<span>!</span>}
      title="Oops"
      description={message}
      action={onRetry ? { label: 'Try again', onClick: onRetry } : undefined}
    />
  );
}
