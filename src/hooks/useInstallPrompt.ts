import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const STORAGE_KEY = 'irl_install_prompt_dismissed_at';
// Don't show again for 7 days after dismissal
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone);
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if user recently dismissed
    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_TTL_MS) {
        return; // Still within dismiss window, don't capture prompt
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';

    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);

    if (result.outcome === 'dismissed') {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }

    return result.outcome;
  };

  const dismiss = () => {
    setIsInstallable(false);
    setDeferredPrompt(null);
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  return { isInstallable, isInstalled, promptInstall, dismiss };
}
