import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[9999] animate-slide-down">
      <div className="bg-slate-900 text-white rounded-2xl shadow-xl p-4 flex items-center gap-3 max-w-md mx-auto">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">New version available</p>
          <p className="text-xs text-slate-400 mt-0.5">Tap to get the latest events and features</p>
        </div>
        <button
          onClick={() => updateServiceWorker(true)}
          className="px-3 py-1.5 bg-sky-500 text-white text-sm font-medium rounded-xl hover:bg-sky-600 transition-colors flex-shrink-0"
        >
          Update
        </button>
      </div>
    </div>
  );
}
