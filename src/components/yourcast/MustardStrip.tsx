import { useNavigate } from 'react-router-dom';

// Mustard colors
const MUSTARD = '#C4A040';
const MUSTARD_INK = '#1E1808';

interface MustardStripProps {
  headline?: string;
  subtitle?: string;
}

export function MustardStrip({
  headline = "A good week to be outside.",
  subtitle = "Three art-forward picks, one long lunch, and a waterfront walk.",
}: MustardStripProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/yourcast');
  };

  return (
    <div
      onClick={handleClick}
      className="mx-4 mb-4 rounded-[22px] p-5 cursor-pointer transition-transform active:scale-[0.98] btn-press"
      style={{ backgroundColor: MUSTARD }}
    >
      {/* YOURCAST label */}
      <p
        className="text-xs font-bold tracking-[0.2em] uppercase mb-2"
        style={{ color: MUSTARD_INK, opacity: 0.7 }}
      >
        YOURCAST
      </p>

      {/* Headline */}
      <h3
        className="font-serif text-2xl font-semibold leading-tight mb-2"
        style={{ color: MUSTARD_INK }}
      >
        {headline}
      </h3>

      {/* Subtitle */}
      <p
        className="text-sm font-light leading-relaxed"
        style={{ color: MUSTARD_INK, opacity: 0.8 }}
      >
        {subtitle}
      </p>

      {/* Arrow indicator */}
      <div className="flex items-center gap-1 mt-3" style={{ color: MUSTARD_INK }}>
        <span className="text-sm font-medium">See your picks</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
