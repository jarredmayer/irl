/**
 * Wordmark Test Page
 *
 * Displays "IRL" in 4 font options at 2 sizes for comparison.
 */

export function WordmarkTest() {
  const options = [
    { label: 'A) Bodoni Moda Bold', fontFamily: "'Bodoni Moda', Georgia, serif", fontWeight: 700, fontStyle: 'normal' },
    { label: 'B) Bodoni Moda Bold Italic', fontFamily: "'Bodoni Moda', Georgia, serif", fontWeight: 700, fontStyle: 'italic' },
    { label: 'C) Bodoni Moda (opsz 72)', fontFamily: "'Bodoni Moda', Georgia, serif", fontWeight: 700, fontStyle: 'normal' },
    { label: 'D) Bodoni Moda Light', fontFamily: "'Bodoni Moda', Georgia, serif", fontWeight: 400, fontStyle: 'normal' },
  ];

  return (
    <div className="min-h-screen bg-white p-6">
      <h1 className="text-xl font-medium text-ink mb-2">Wordmark Test</h1>
      <p className="text-sm text-ink-2 mb-8">Pick one option for the IRL wordmark</p>

      {/* 32px (nav size) */}
      <section className="mb-12">
        <h2 className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-4">
          32px — Nav / Header size
        </h2>
        <div className="grid grid-cols-2 gap-6">
          {options.map((opt) => (
            <div key={opt.label} className="p-4 border border-divider rounded-xl">
              <p className="text-xs text-ink-3 mb-2">{opt.label}</p>
              <span
                style={{
                  fontFamily: opt.fontFamily,
                  fontWeight: opt.fontWeight,
                  fontStyle: opt.fontStyle,
                  fontSize: '32px',
                  lineHeight: 1,
                  color: '#0E0E0E',
                }}
              >
                IRL
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 64px (hero size) */}
      <section className="mb-12">
        <h2 className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-4">
          64px — Hero size
        </h2>
        <div className="grid grid-cols-2 gap-6">
          {options.map((opt) => (
            <div key={opt.label} className="p-4 border border-divider rounded-xl">
              <p className="text-xs text-ink-3 mb-2">{opt.label}</p>
              <span
                style={{
                  fontFamily: opt.fontFamily,
                  fontWeight: opt.fontWeight,
                  fontStyle: opt.fontStyle,
                  fontSize: '64px',
                  lineHeight: 1,
                  color: '#0E0E0E',
                }}
              >
                IRL
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Side by side comparison on dark */}
      <section>
        <h2 className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-4">
          On Dark Background (Hero context)
        </h2>
        <div className="grid grid-cols-2 gap-6">
          {options.map((opt) => (
            <div key={opt.label} className="p-6 bg-ink rounded-xl">
              <p className="text-xs text-white/50 mb-2">{opt.label}</p>
              <span
                style={{
                  fontFamily: opt.fontFamily,
                  fontWeight: opt.fontWeight,
                  fontStyle: opt.fontStyle,
                  fontSize: '64px',
                  lineHeight: 1,
                  color: '#FFFFFF',
                }}
              >
                IRL
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-sm text-ink-3 mt-8 text-center">
        Pick A, B, C, or D before I proceed with the design implementation.
      </p>
    </div>
  );
}
