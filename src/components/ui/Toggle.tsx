interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: ToggleProps) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div
          className={`
            w-11 h-6 rounded-full transition-colors
            ${disabled ? 'bg-slate-200' : 'bg-slate-300'}
            peer-checked:bg-sky-500
            peer-focus:ring-2 peer-focus:ring-sky-300
          `}
        />
        <div
          className={`
            absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
            peer-checked:translate-x-5
          `}
        />
      </div>
      {label && (
        <span
          className={`text-sm ${disabled ? 'text-slate-400' : 'text-slate-700'}`}
        >
          {label}
        </span>
      )}
    </label>
  );
}
