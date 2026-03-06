/**
 * Submit Event Page
 *
 * Standalone page at /submit for event submissions.
 * Integrates with the Submission Verification Agent.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '../../constants';
import {
  submitEvent,
  type EventSubmission,
} from '../../agents/submission-agent';

export function SubmitPage() {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState<'Miami' | 'Fort Lauderdale' | 'Palm Beach'>(
    'Miami'
  );
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate required fields
    if (!title.trim()) {
      setError('Event title is required');
      return;
    }
    if (!date) {
      setError('Event date is required');
      return;
    }
    if (!venueName.trim()) {
      setError('Venue name is required');
      return;
    }
    if (!address.trim()) {
      setError('Address is required');
      return;
    }
    if (!category) {
      setError('Category is required');
      return;
    }
    if (!description.trim() || description.length < 50) {
      setError('Please provide a description (at least 50 characters)');
      return;
    }
    if (!instagramHandle.trim() && !websiteUrl.trim()) {
      setError(
        'Please provide either an Instagram handle or website URL for verification'
      );
      return;
    }
    if (!contactEmail.trim() || !contactEmail.includes('@')) {
      setError('A valid contact email is required');
      return;
    }

    setIsSubmitting(true);

    const submission: EventSubmission = {
      title: title.trim(),
      date,
      time,
      venueName: venueName.trim(),
      address: address.trim(),
      description: description.trim(),
      category,
      isFree,
      price: isFree ? undefined : parseFloat(price) || undefined,
      imageUrl: imageUrl.trim() || undefined,
      instagramHandle: instagramHandle.trim().replace(/^@/, '') || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
      ticketUrl: ticketUrl.trim() || undefined,
      contactEmail: contactEmail.trim(),
    };

    // Get existing events for cross-reference (in a real app, this would come from an API)
    const existingEvents: { id: string; title: string; venueName?: string; startAt: string }[] = [];
    try {
      const eventsResponse = await fetch('/irl/data/events.json');
      if (eventsResponse.ok) {
        const events = await eventsResponse.json();
        existingEvents.push(
          ...events.map((e: { id: string; title: string; venueName?: string; startAt: string }) => ({
            id: e.id,
            title: e.title,
            venueName: e.venueName,
            startAt: e.startAt,
          }))
        );
      }
    } catch {
      // Continue without cross-reference
    }

    const result = await submitEvent(submission, existingEvents);

    setIsSubmitting(false);

    if (result.success) {
      setSuccess(result.message);
      // Reset form
      setTitle('');
      setDate('');
      setTime('19:00');
      setVenueName('');
      setAddress('');
      setCategory('');
      setDescription('');
      setIsFree(true);
      setPrice('');
      setImageUrl('');
      setInstagramHandle('');
      setWebsiteUrl('');
      setTicketUrl('');
      setContactEmail('');
    } else {
      setError(result.message);
    }
  };

  // Get tomorrow's date as minimum
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Submit Event</h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Form */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {success ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Event Submitted
            </h2>
            <p className="text-slate-600 mb-6">{success}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setSuccess(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Submit Another
              </button>
              <Link
                to="/"
                className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
              >
                Back to Feed
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <p className="text-sm text-slate-500">
              Know about an event we should feature? Submit it here and our team
              will review it. Verified submissions typically appear within 24
              hours.
            </p>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Event Details Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Event Details</h3>

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
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
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
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">Select category...</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
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
                  placeholder="Tell us about the event. What makes it special? Who should attend?"
                  rows={4}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">
                  {description.length}/50 characters minimum
                </p>
              </div>
            </div>

            {/* Venue Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Venue</h3>

              {/* Venue Name */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Venue Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="e.g., Pérez Art Museum Miami"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Address */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full street address"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* City */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  City <span className="text-red-500">*</span>
                </label>
                <select
                  value={city}
                  onChange={(e) =>
                    setCity(
                      e.target.value as 'Miami' | 'Fort Lauderdale' | 'Palm Beach'
                    )
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="Miami">Miami</option>
                  <option value="Fort Lauderdale">Fort Lauderdale</option>
                  <option value="Palm Beach">Palm Beach</option>
                </select>
              </div>
            </div>

            {/* Price Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Price</h3>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={isFree}
                    onChange={() => setIsFree(true)}
                    className="w-4 h-4 text-sky-500"
                  />
                  <span className="text-sm">Free</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isFree}
                    onChange={() => setIsFree(false)}
                    className="w-4 h-4 text-sky-500"
                  />
                  <span className="text-sm">Paid</span>
                </label>
              </div>

              {!isFree && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

              {/* Ticket URL */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Ticket URL
                </label>
                <input
                  type="url"
                  value={ticketUrl}
                  onChange={(e) => setTicketUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Image Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Event Image</h3>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Link to an event flyer or promotional image
                </p>
              </div>
            </div>

            {/* Verification Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">
                Verification{' '}
                <span className="text-sm font-normal text-slate-500">
                  (one required)
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Help us verify this is a legitimate event by providing either an
                Instagram handle or website URL.
              </p>

              {/* Instagram Handle */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Instagram Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    @
                  </span>
                  <input
                    type="text"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    placeholder="venuename or artistname"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="text-center text-xs text-slate-400">or</div>

              {/* Website URL */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Venue/Artist Website
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Contact Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Contact</h3>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  We may reach out if we have questions. Not shown publicly.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-sky-500 text-white font-medium rounded-xl hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Verifying & Submitting...
                </span>
              ) : (
                'Submit Event'
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
