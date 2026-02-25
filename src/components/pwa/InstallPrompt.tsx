import { useEffect, useState } from 'react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

/**
 * "Add to Home Screen" banner that appears after the user has spent
 * some time in the app (not immediately on load).
 *
 * Shows:
 * - On Android/Chrome: native install prompt via beforeinstallprompt
 * - On iOS Safari: manual instruction sheet (no native API available)
 * - Not shown: if already installed, or dismissed within 7 days
 */
export function InstallPrompt() {
  const { isInstallable, promptInstall, dismiss } = useInstallPrompt();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [visible, setVisible] = useState(false);

  // Detect iOS Safari (no beforeinstallprompt API)
  const isIOSSafari = (() => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua);
    const isStandalone = ('standalone' in navigator) &&
      (navigator as unknown as { standalone: boolean }).standalone;
    return isIOS && isSafari && !isStandalone;
  })();

  // Check iOS dismiss state
  const iosAlreadyDismissed = (() => {
    try {
      const ts = localStorage.getItem('irl_ios_install_dismissed_at');
      if (!ts) return false;
      return Date.now() - parseInt(ts, 10) < 7 * 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  })();

  // Delay showing the banner: wait 45 seconds of engagement
  useEffect(() => {
    if (!isInstallable && !isIOSSafari) return;
    if (iosAlreadyDismissed) return;

    const timer = setTimeout(() => setVisible(true), 45_000);
    return () => clearTimeout(timer);
  }, [isInstallable, isIOSSafari, iosAlreadyDismissed]);

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome !== 'unavailable') {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    dismiss();
    if (isIOSSafari) {
      try {
        localStorage.setItem('irl_ios_install_dismissed_at', Date.now().toString());
      } catch { /* ignore */ }
    }
  };

  // Nothing to show
  if (!visible) return null;
  if (!isInstallable && !isIOSSafari) return null;

  // iOS manual instructions sheet
  if (isIOSSafari && showIOSInstructions) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-md bg-white rounded-t-2xl p-6 shadow-2xl animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Add IRL to Home Screen</h2>
            <button
              onClick={handleDismiss}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-400"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <ol className="space-y-4 text-slate-700">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <span>
                Tap the{' '}
                <span className="inline-flex items-center gap-1 font-medium">
                  <ShareIcon /> Share
                </span>{' '}
                button at the bottom of your browser
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <span>
                Scroll down and tap{' '}
                <span className="font-medium">"Add to Home Screen"</span>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <span>Tap <span className="font-medium">"Add"</span> in the top right</span>
            </li>
          </ol>

          <p className="mt-4 text-xs text-slate-400 text-center">
            IRL will open like a native app — no browser chrome
          </p>
        </div>
      </div>
    );
  }

  // Standard install banner (bottom of screen, not intrusive)
  return (
    <div className="fixed bottom-20 left-4 right-4 z-[200] animate-slide-up">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 flex items-center gap-3">
        {/* App icon */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm tracking-tight">IRL</span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm">Add IRL to your home screen</p>
          <p className="text-xs text-slate-500 mt-0.5">Get quick access to events near you</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={isIOSSafari ? () => setShowIOSInstructions(true) : handleInstall}
            className="px-3 py-2 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      className="inline w-4 h-4 text-sky-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}
