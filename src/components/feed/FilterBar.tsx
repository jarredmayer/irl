import { useState } from 'react';
import { Chip, ChipGroup } from '../ui/Chip';
import type { TimeFilter, FilterState, City } from '../../types';
import { TAGS, MAX_PRICE, CATEGORIES, CATEGORY_COLORS } from '../../constants';

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  hasLocation?: boolean;
}

const timeFilters: { value: TimeFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'weekend', label: 'Weekend' },
  { value: 'this-week', label: 'This Week' },
  { value: 'all', label: 'All' },
];

const cityFilters: { value: City | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'Miami', label: 'Miami' },
  { value: 'Fort Lauderdale', label: 'FLL' },
];

const popularTags = TAGS.slice(0, 12);

export function FilterBar({ filters, onFiltersChange, hasLocation = false }: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Count active filters
  const activeFilterCount =
    (filters.selectedCategories.length > 0 ? 1 : 0) +
    (filters.selectedTags.length > 0 ? 1 : 0) +
    (filters.nearMeOnly ? 1 : 0) +
    (filters.freeOnly ? 1 : 0) +
    (filters.city ? 1 : 0) +
    (filters.timeFilter !== 'all' ? 1 : 0);

  const toggleTag = (tag: string) => {
    const newTags = filters.selectedTags.includes(tag)
      ? filters.selectedTags.filter((t) => t !== tag)
      : [...filters.selectedTags, tag];
    updateFilter('selectedTags', newTags);
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.selectedCategories.includes(category)
      ? filters.selectedCategories.filter((c) => c !== category)
      : [...filters.selectedCategories, category];
    updateFilter('selectedCategories', newCategories);
  };

  const toggleAllCategories = () => {
    if (filters.selectedCategories.length === CATEGORIES.length) {
      updateFilter('selectedCategories', []);
    } else {
      updateFilter('selectedCategories', [...CATEGORIES]);
    }
  };

  const toggleAllTags = () => {
    if (filters.selectedTags.length === popularTags.length) {
      updateFilter('selectedTags', []);
    } else {
      updateFilter('selectedTags', [...popularTags]);
    }
  };

  return (
    <div className="bg-white border-b border-slate-100 sticky top-[52px] z-20">
      {/* Search bar + Filter toggle */}
      <div className="px-4 py-2 flex items-center gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search events, venues..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
          {filters.searchQuery && (
            <button
              onClick={() => updateFilter('searchQuery', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {/* Filter toggle button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            isExpanded || activeFilterCount > 0
              ? 'bg-sky-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-xs ${
              isExpanded ? 'bg-white text-sky-500' : 'bg-sky-500 text-white'
            }`}>
              {activeFilterCount}
            </span>
          )}
          <svg
            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Collapsible filter sections */}
      {isExpanded && (
        <>
          {/* Date range filter */}
      <div className="px-4 py-2 flex items-center gap-3 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">From</label>
          <input
            type="date"
            value={filters.dateRange[0]}
            onChange={(e) => updateFilter('dateRange', [e.target.value, filters.dateRange[1]])}
            className="px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">To</label>
          <input
            type="date"
            value={filters.dateRange[1]}
            onChange={(e) => updateFilter('dateRange', [filters.dateRange[0], e.target.value])}
            className="px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Time filters */}
      <div className="px-4 py-2 overflow-x-auto hide-scrollbar">
        <ChipGroup>
          {timeFilters.map((filter) => (
            <Chip
              key={filter.value}
              label={filter.label}
              selected={filters.timeFilter === filter.value}
              onClick={() => updateFilter('timeFilter', filter.value)}
              size="sm"
            />
          ))}
        </ChipGroup>
      </div>

      {/* City + Near me + Price row */}
      <div className="px-4 py-2 flex items-center gap-2 border-t border-slate-50 overflow-x-auto hide-scrollbar">
        {cityFilters.map((filter) => (
          <Chip
            key={filter.value || 'all'}
            label={filter.label}
            selected={filters.city === filter.value}
            onClick={() => updateFilter('city', filter.value)}
            size="sm"
            variant="outline"
          />
        ))}

        {hasLocation && (
          <>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <Chip
              label="Near me"
              selected={filters.nearMeOnly}
              onClick={() => updateFilter('nearMeOnly', !filters.nearMeOnly)}
              size="sm"
              variant="outline"
            />
          </>
        )}

        <div className="w-px h-4 bg-slate-200 mx-1" />
        <Chip
          label="Free only"
          selected={filters.freeOnly}
          onClick={() => updateFilter('freeOnly', !filters.freeOnly)}
          size="sm"
          variant="outline"
        />

        {/* Price range */}
        {!filters.freeOnly && (
          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs text-slate-500 whitespace-nowrap">Up to ${filters.priceRange[1]}</span>
            <input
              type="range"
              min={0}
              max={MAX_PRICE}
              value={filters.priceRange[1]}
              onChange={(e) => updateFilter('priceRange', [0, Number(e.target.value)])}
              className="w-20 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>
        )}
      </div>

      {/* Category filters */}
      <div className="px-4 py-2 overflow-x-auto hide-scrollbar border-t border-slate-50">
        <ChipGroup>
          <button
            onClick={toggleAllCategories}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200"
          >
            {filters.selectedCategories.length === CATEGORIES.length ? 'Clear all' : 'Select all'}
          </button>
          {CATEGORIES.map((category) => {
            const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS['Other'];
            const isSelected = filters.selectedCategories.includes(category);
            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  backgroundColor: isSelected ? colors.primary : `${colors.primary}15`,
                  color: isSelected ? 'white' : colors.primary,
                  border: `1px solid ${isSelected ? colors.primary : `${colors.primary}40`}`,
                }}
              >
                <span>{colors.emoji}</span>
                <span>{category}</span>
              </button>
            );
          })}
        </ChipGroup>
      </div>

      {/* Tag filters */}
      <div className="px-4 py-2 overflow-x-auto hide-scrollbar border-t border-slate-50">
        <ChipGroup>
          <button
            onClick={toggleAllTags}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200"
          >
            {filters.selectedTags.length === popularTags.length ? 'Clear all' : 'Select all'}
          </button>
          {popularTags.map((tag) => (
            <Chip
              key={tag}
              label={tag.replace(/-/g, ' ')}
              selected={filters.selectedTags.includes(tag)}
              onClick={() => toggleTag(tag)}
              size="sm"
              variant="outline"
            />
          ))}
        </ChipGroup>
      </div>
        </>
      )}
    </div>
  );
}
