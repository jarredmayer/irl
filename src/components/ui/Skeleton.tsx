/**
 * Skeleton Loading Components
 *
 * Placeholder shapes shown while content loads.
 */

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-slate-200 rounded ${className}`}
    />
  );
}

/**
 * Event Card Skeleton
 *
 * Matches the layout of EventCard for smooth loading transition.
 */
export function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
      <div className="flex min-h-[180px]">
        {/* Image placeholder */}
        <div className="w-[160px] md:w-[200px] flex-shrink-0">
          <Skeleton className="w-full h-full rounded-none" />
        </div>

        {/* Content placeholder */}
        <div className="flex-1 p-4 flex flex-col">
          {/* Category badge */}
          <Skeleton className="w-16 h-5 rounded-full mb-2" />

          {/* Title */}
          <Skeleton className="w-full h-5 mb-2" />
          <Skeleton className="w-3/4 h-5 mb-3" />

          {/* Date */}
          <Skeleton className="w-32 h-4 mb-2" />

          {/* Venue */}
          <Skeleton className="w-24 h-4 mb-auto" />

          {/* Bottom row */}
          <div className="flex items-center gap-2 mt-3">
            <Skeleton className="w-16 h-4" />
            <Skeleton className="w-20 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hero Card Skeleton
 *
 * Large featured event card skeleton.
 */
export function HeroCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
      {/* Image placeholder */}
      <Skeleton className="w-full h-48 rounded-none" />

      {/* Content placeholder */}
      <div className="p-4">
        {/* Category badge */}
        <Skeleton className="w-20 h-6 rounded-full mb-3" />

        {/* Title */}
        <Skeleton className="w-full h-6 mb-2" />
        <Skeleton className="w-2/3 h-6 mb-3" />

        {/* Date */}
        <Skeleton className="w-40 h-4 mb-2" />

        {/* Description */}
        <Skeleton className="w-full h-4 mb-1" />
        <Skeleton className="w-full h-4 mb-1" />
        <Skeleton className="w-3/4 h-4" />
      </div>
    </div>
  );
}

/**
 * Feed Section Skeleton
 *
 * Shows 3 event card skeletons in a section.
 */
export function FeedSectionSkeleton() {
  return (
    <div className="space-y-4">
      {/* Section title */}
      <Skeleton className="w-24 h-6 mb-4" />

      {/* Event cards */}
      <EventCardSkeleton />
      <EventCardSkeleton />
      <EventCardSkeleton />
    </div>
  );
}

/**
 * Full Feed Skeleton
 *
 * Complete loading state for the feed view.
 */
export function FeedSkeleton() {
  return (
    <div className="px-4 py-4 space-y-8">
      {/* Weather banner skeleton */}
      <Skeleton className="w-full h-12 rounded-xl" />

      {/* Hero card */}
      <HeroCardSkeleton />

      {/* Feed sections */}
      <FeedSectionSkeleton />
      <FeedSectionSkeleton />
    </div>
  );
}
