import { useState } from 'react';
import type { SubmittedAccount } from '../../services/storage';

interface SubmitAccountFormProps {
  onClose: () => void;
  onSubmit: (account: SubmittedAccount) => void;
}

const ACCOUNT_TYPES: { value: SubmittedAccount['accountType']; label: string; description: string }[] = [
  { value: 'venue', label: 'Venue', description: 'Bar, club, park, or event space' },
  { value: 'organizer', label: 'Event organizer', description: 'Person or org that throws events' },
  { value: 'artist', label: 'Artist / performer', description: 'DJ, band, comedian, etc.' },
  { value: 'pop-up', label: 'Pop-up / series', description: 'Market, dinner series, recurring pop-up' },
];

export function SubmitAccountForm({ onClose, onSubmit }: SubmitAccountFormProps) {
  const [handle, setHandle] = useState('');
  const [accountType, setAccountType] = useState<SubmittedAccount['accountType']>('venue');
  const [city, setCity] = useState<SubmittedAccount['city']>('Miami');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const cleanHandle = handle.replace(/^@/, '').trim();

  const validate = (): string | null => {
    if (!cleanHandle) return 'Instagram handle is required';
    if (!/^[\w.]+$/.test(cleanHandle)) return 'Handle can only contain letters, numbers, underscores, and dots';
    if (!description || description.trim().length < 20) return 'Please tell us a bit more (at least 20 characters)';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError('');

    const suffix = Math.random().toString(36).slice(2, 7);
    const account: SubmittedAccount = {
      id: `acct-${Date.now()}-${suffix}`,
      handle: cleanHandle,
      accountType,
      city,
      description: description.trim(),
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    await new Promise((r) => setTimeout(r, 400));
    onSubmit(account);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900 text-lg">Suggest an Instagram account</h2>
            <p className="text-xs text-slate-400 mt-0.5">We'll review and add it to our scraper</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-5 py-4 space-y-5">
            {/* Instagram handle */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Instagram handle <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-sky-500">
                <span className="pl-3 pr-1 text-slate-400 font-medium text-sm select-none">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="myvenue"
                  className="flex-1 py-3 pr-3 text-sm outline-none bg-transparent placeholder-slate-300"
                  autoComplete="off"
                  autoCapitalize="none"
                />
              </div>
            </div>

            {/* Account type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Account type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ACCOUNT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setAccountType(t.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      accountType === t.value
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className={`text-sm font-medium ${accountType === t.value ? 'text-sky-700' : 'text-slate-700'}`}>
                      {t.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
              <div className="flex gap-2">
                {(['Miami', 'Fort Lauderdale', 'Both'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCity(c)}
                    className={`flex-1 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${
                      city === c
                        ? 'border-sky-500 bg-sky-50 text-sky-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Why should we add this account? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What kind of events do they post? How active are they? Any other context…"
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm resize-none outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder-slate-300"
              />
              <p className={`text-xs mt-1 text-right ${description.length < 20 ? 'text-slate-400' : 'text-emerald-500'}`}>
                {description.length}/20 min
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                {error}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 shrink-0">
          <button
            type="submit"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold rounded-xl disabled:opacity-60 transition-opacity hover:opacity-90"
          >
            {isSubmitting ? 'Submitting…' : 'Submit account'}
          </button>
        </div>
      </div>
    </div>
  );
}
