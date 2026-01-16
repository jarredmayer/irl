interface WeatherNoteProps {
  note: string;
  onClick?: () => void;
}

export function WeatherNote({ note, onClick }: WeatherNoteProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-2 bg-sky-50 border-b border-sky-100 text-left hover:bg-sky-100 transition-colors"
    >
      <p className="text-sm text-sky-700">{note}</p>
    </button>
  );
}
