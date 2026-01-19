import { useState } from 'react';
import { CATEGORIES, NEIGHBORHOODS } from '../../constants';

interface SubmitEventFormProps {
  onClose: () => void;
  onSubmit: (event: UserSubmittedEvent) => void;
}

export interface UserSubmittedEvent {
  id: string;
  title: string;
  startAt: string;
  venueName?: string;
  address?: string;
  neighborhood: string;
  city: 'Miami' | 'Fort Lauderdale';
  category: string;
  description: string;
  sourceUrl?: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export function SubmitEventForm({ onClose, onSubmit }: SubmitEventFormProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState<'Miami' | 'Fort Lauderdale'>('Miami');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!title.trim()) {
      setError('Event title is required');
      return;
    }
    if (!date) {
      setError('Event date is required');
      return;
    }
    if (!neighborhood) {
      setError('Neighborhood is required');
      return;
    }
    if (!category) {
      setError('Category is required');
      return;
    }
    if (!description.trim() || description.length < 20) {
      setError('Please provide a description (at least 20 characters)');
      return;
    }

    setIsSubmitting(true);

    const event: UserSubmittedEvent = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      startAt: `${date}T${time}:00`,
      venueName: venueName.trim() || undefined,
      address: address.trim() || undefined,
      neighborhood,
      city,
      category,
      description: description.trim(),
      sourceUrl: sourceUrl.trim() || undefined,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    // Simulate a brief delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    onSubmit(event);
    setIsSubmitting(false);
  };

  // Get tomorrow's date as minimum
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Submit an Event</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-sm text-slate-500">
            Know about an event we're missing? Submit it and we'll review it for the feed.
          </p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Jazz Night at Blue Door"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                min={minDate}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Venue Name
            </label>
            <input
              type="text"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="e.g., Blue Door at Delano"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Address */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* City and Neighborhood */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                City <span className="text-red-500">*</span>
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value as 'Miami' | 'Fort Lauderdale')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="Miami">Miami</option>
                <option value="Fort Lauderdale">Fort Lauderdale</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Neighborhood <span className="text-red-500">*</span>
              </label>
              <select
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Select...</option>
                {NEIGHBORHOODS[city].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Select...</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about the event. What makes it special?"
              rows={3}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">
              {description.length}/20 characters minimum
            </p>
          </div>

          {/* Source URL */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Source URL
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              Link to the event page, social media post, or ticket site
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 bg-sky-500 text-white font-medium rounded-xl hover:bg-sky-600 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
