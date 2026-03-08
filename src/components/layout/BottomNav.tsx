import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Feed', icon: FeedIcon },
  { path: '/map', label: 'Map', icon: MapIcon },
  { path: '/saved', label: 'Saved', icon: SavedIcon },
  { path: '/yourcast', label: 'Cast', icon: YourcastIcon },
  { path: '/profile', label: 'Profile', icon: ProfileIcon },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[2000] bg-white border-t border-[var(--color-divider)] safe-area-bottom">
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors btn-press relative ${
                isActive ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
              }`}
            >
              <Icon className="w-6 h-6" filled={isActive} />
              <span className="text-[11px] font-medium" style={{ letterSpacing: '0.04em' }}>{item.label}</span>
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute bottom-2 w-[3px] h-[3px] rounded-full bg-ink" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function FeedIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      {filled ? (
        <path fill="currentColor" stroke="none" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm3 2v2h10V8H7zm0 4v2h10v-2H7zm0 4v2h6v-2H7z" />
      ) : (
        <>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <line x1="7" y1="8" x2="17" y2="8" />
          <line x1="7" y1="12" x2="17" y2="12" />
          <line x1="7" y1="16" x2="13" y2="16" />
        </>
      )}
    </svg>
  );
}

function MapIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      {filled ? (
        <path fill="currentColor" stroke="none" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
      ) : (
        <>
          <path d="M12 21s-7-7.75-7-12a7 7 0 1 1 14 0c0 4.25-7 12-7 12z" />
          <circle cx="12" cy="9" r="2.5" />
        </>
      )}
    </svg>
  );
}

function YourcastIcon({ className, filled }: { className?: string; filled?: boolean }) {
  // Sparkle icon for personalized content
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      {filled ? (
        <>
          <path fill="currentColor" stroke="none" d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8 2.4-7.2-6-4.8h7.6L12 2z" />
        </>
      ) : (
        <>
          <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8 2.4-7.2-6-4.8h7.6L12 2z" />
        </>
      )}
    </svg>
  );
}

function SavedIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      {filled ? (
        <path fill="currentColor" stroke="none" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      ) : (
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      )}
    </svg>
  );
}

function ProfileIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      {filled ? (
        <>
          <circle fill="currentColor" stroke="none" cx="12" cy="8" r="4" />
          <path fill="currentColor" stroke="none" d="M12 14c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z" />
        </>
      ) : (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        </>
      )}
    </svg>
  );
}
