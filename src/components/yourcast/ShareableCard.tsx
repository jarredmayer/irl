import { useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';
import type { ScoredEvent } from '../../types';

interface ShareableCardProps {
  headline: string;
  events: ScoredEvent[];
  weekLabel: string;
  onClose: () => void;
}

// Theme colors
const THEMES = {
  sunny: { bg: '#C4A040', text: '#1E1808' },
  arts: { bg: '#2E6560', text: '#FFFFFF' },
  nightlife: { bg: '#7A2D3A', text: '#FFFFFF' },
};

export function ShareableCard({ headline, events, weekLabel, onClose }: ShareableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Determine theme based on headline/events
  const getTheme = () => {
    const headlineLower = headline.toLowerCase();
    if (headlineLower.includes('sunny') || headlineLower.includes('outside') || headlineLower.includes('outdoor')) {
      return THEMES.sunny;
    }
    if (headlineLower.includes('art') || headlineLower.includes('culture') || headlineLower.includes('museum')) {
      return THEMES.arts;
    }
    if (headlineLower.includes('night') || headlineLower.includes('party') || headlineLower.includes('music')) {
      return THEMES.nightlife;
    }
    // Default to sunny
    return THEMES.sunny;
  };

  const theme = getTheme();

  const generateImage = useCallback(async () => {
    if (!cardRef.current) return null;
    setIsGenerating(true);

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: theme.bg,
        scale: 2, // Higher resolution
        useCORS: true,
        logging: false,
      });
      return canvas;
    } catch (error) {
      console.error('Failed to generate image:', error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [theme.bg]);

  const handleDownload = useCallback(async () => {
    const canvas = await generateImage();
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `yourcast-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [generateImage]);

  const handleShare = useCallback(async () => {
    const canvas = await generateImage();
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const file = new File([blob], 'yourcast.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'My Yourcast',
            text: headline,
          });
        } catch (error) {
          // User cancelled or error
          console.log('Share cancelled or failed:', error);
        }
      } else {
        // Fallback to download
        handleDownload();
      }
    }, 'image/png');
  }, [generateImage, handleDownload, headline]);

  // Get theme title based on content
  const themeTitle = headline.toLowerCase().includes('sunny') || headline.toLowerCase().includes('outside')
    ? 'Sunny Weekend'
    : headline.toLowerCase().includes('art')
    ? 'Arts & Culture'
    : 'This Weekend';

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex flex-col items-center gap-4 max-w-sm w-full">
        {/* The shareable card (9:16 portrait) */}
        <div
          ref={cardRef}
          className="w-full rounded-2xl overflow-hidden"
          style={{
            backgroundColor: theme.bg,
            aspectRatio: '9/16',
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header: IRL wordmark + week */}
          <div className="flex items-start justify-between mb-auto">
            <span
              className="font-wordmark bodoni-wordmark-sm text-2xl font-semibold"
              style={{ color: theme.text }}
            >
              IRL
            </span>
            <span
              className="text-xs font-medium uppercase tracking-wider opacity-70"
              style={{ color: theme.text }}
            >
              {weekLabel}
            </span>
          </div>

          {/* Theme title */}
          <div className="my-auto">
            <p
              className="text-xs font-bold uppercase tracking-[0.2em] mb-4 opacity-60"
              style={{ color: theme.text }}
            >
              YOURCAST
            </p>

            <h2
              className="font-serif text-4xl font-semibold leading-tight mb-8"
              style={{ color: theme.text }}
            >
              {themeTitle}
            </h2>

            {/* Event names stacked */}
            <div className="space-y-3">
              {events.slice(0, 3).map((event, index) => (
                <p
                  key={event.id}
                  className="text-lg font-medium leading-snug"
                  style={{ color: theme.text, opacity: 1 - index * 0.15 }}
                >
                  {event.title}
                </p>
              ))}
            </div>
          </div>

          {/* Editorial line at bottom */}
          <div className="mt-auto">
            <p
              className="font-serif text-sm italic mb-6 opacity-80"
              style={{ color: theme.text }}
            >
              {headline}
            </p>

            {/* goirl.app */}
            <p
              className="text-xs font-medium opacity-50"
              style={{ color: theme.text }}
            >
              goirl.app
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 w-full">
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white text-ink font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download
              </>
            )}
          </button>

          <button
            onClick={handleShare}
            disabled={isGenerating}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-ink text-white font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
                </svg>
                Share
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
