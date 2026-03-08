import { useState, useCallback } from 'react';
import { Chip, ChipGroup } from '../ui/Chip';
import type { TimeFilter, FilterState, City, WeatherForecast } from '../../types';
import { CATEGORIES, CATEGORY_COLORS, POPULAR_NEIGHBORHOODS, MAX_PRICE } from '../../constants';
import { parseNaturalLanguageSearch, hasApiKey } from '../../services/ai';

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  hasLocation?: boolean;
  onConfigureAI?: () => void;
  weather?: WeatherForecast | null;
  maxPrice?: number;
}

// Time filter options for the dedicated time row
const timeFilters: { id: TimeFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'weekend', label: 'This Weekend' },
  { id: 'this-week', label: 'This Week' },
  { id: 'next-week', label: 'Next Week' },
  { id: 'this-month', label: 'This Month' },
  { id: 'all', label: 'All' },
];

// Quick filter pills for the category/attribute row (no time filters here)
const quickFilters = [
  { id: 'sunny', label: '☀ Sunny', type: 'weather' as const },
  { id: 'free', label: 'Free', type: 'price' as const },
  { id: 'Music', label: 'Music', type: 'category' as const },
  { id: 'Art', label: 'Arts', type: 'category' as const },
  { id: 'Outdoors', label: 'Outdoor', type: 'category' as const },
  { id: 'Food & Drink', label: 'Food', type: 'category' as const },
  { id: 'Wellness', label: 'Wellness', type: 'category' as const },
];

const cityFilters: { value: City | undefined; label: string }[] = [
  { value: undefined, label: 'All Areas' },
  { value: 'Miami', label: 'Miami' },
  { value: 'Fort Lauderdale', label: 'FLL' },
  { value: 'Palm Beach', label: 'PB' },
];

export function FilterBar({ filters, onFiltersChange, hasLocation = false, onConfigureAI, weather: _weather, maxPrice: dynamicMaxPrice }: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAISearching, setIsAISearching] = useState(false);
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);

  const handleAISearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    if (!hasApiKey()) {
      onConfigureAI?.();
      return;
    }

    setIsAISearching(true);
    setAiInterpretation(null);

    try {
      const result = await parseNaturalLanguageSearch(query);
      if (result) {
        const newFilters = { ...filters };

        if (result.filters.timeFilter) {
          newFilters.timeFilter = result.filters.timeFilter as TimeFilter;
        }
        if (result.filters.selectedCategories?.length) {
          newFilters.selectedCategories = result.filters.selectedCategories;
        }
        if (result.filters.selectedTags?.length) {
          newFilters.selectedTags = result.filters.selectedTags;
        }
        if (result.filters.selectedNeighborhoods?.length) {
          newFilters.selectedNeighborhoods = result.filters.selectedNeighborhoods;
        }
        if (result.filters.city) {
          newFilters.city = result.filters.city as City;
        }
        if (result.filters.freeOnly !== undefined) {
          newFilters.freeOnly = result.filters.freeOnly;
        }
        if (result.filters.nearMeOnly !== undefined) {
          newFilters.nearMeOnly = result.filters.nearMeOnly;
        }

        if (result.searchTerms?.length) {
          newFilters.searchQuery = result.searchTerms.join(' ');
        }

        setAiInterpretation(result.interpretation);
        onFiltersChange(newFilters);
      }
    } catch (error) {
      console.error('AI search failed:', error);
    } finally {
      setIsAISearching(false);
    }
  }, [filters, onFiltersChange, onConfigureAI]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && hasApiKey()) {
      e.preventDefault();
      handleAISearch(filters.searchQuery);
    }
  };

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Handle time filter selection — tapping the already-selected filter resets to default
  const handleTimeFilterClick = (timeFilter: TimeFilter) => {
    if (filters.timeFilter === timeFilter) {
      updateFilter('timeFilter', 'this-week');
    } else {
      updateFilter('timeFilter', timeFilter);
    }
  };

  // Check if a quick filter is active
  const isQuickFilterActive = (filter: typeof quickFilters[0]): boolean => {
    switch (filter.type) {
      case 'weather':
        return filters.sunnyOnly;
      case 'price':
        return filters.freeOnly;
      case 'category':
        return filters.selectedCategories.includes(filter.id);
    }
  };

  // Toggle a quick filter
  const toggleQuickFilter = (filter: typeof quickFilters[0]) => {
    switch (filter.type) {
      case 'weather':
        // Sunny filter - show outdoor events with clear weather
        onFiltersChange({
          ...filters,
          sunnyOnly: !filters.sunnyOnly,
          outdoorOnly: !filters.sunnyOnly ? true : filters.outdoorOnly,
        });
        break;
      case 'price':
        updateFilter('freeOnly', !filters.freeOnly);
        break;
      case 'category': {
        const newCategories = filters.selectedCategories.includes(filter.id)
          ? filters.selectedCategories.filter(c => c !== filter.id)
          : [...filters.selectedCategories, filter.id];
        updateFilter('selectedCategories', newCategories);
        break;
      }
    }
  };

  const toggleNeighborhood = (neighborhood: string) => {
    const newNeighborhoods = filters.selectedNeighborhoods.includes(neighborhood)
      ? filters.selectedNeighborhoods.filter(n => n !== neighborhood)
      : [...filters.selectedNeighborhoods, neighborhood];
    updateFilter('selectedNeighborhoods', newNeighborhoods);
  };

  // Count active filters
  const activeFilterCount =
    (filters.selectedCategories.length > 0 ? 1 : 0) +
    (filters.selectedNeighborhoods.length > 0 ? 1 : 0) +
    (filters.nearMeOnly ? 1 : 0) +
    (filters.freeOnly ? 1 : 0) +
    (filters.city ? 1 : 0) +
    (filters.timeFilter !== 'this-week' ? 1 : 0) +
    (filters.sunnyOnly ? 1 : 0);

  return (
    <div className="bg-white sticky top-[60px] z-30">
      {/* Search bar row */}
      <div className="px-4 py-3 flex items-center gap-2">
        <div className="relative flex-1">
          {isAISearching ? (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4">
              <div className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          <input
            type="text"
            placeholder={hasApiKey() ? "Try: 'free outdoor events this weekend'" : "Search events, venues..."}
            value={filters.searchQuery}
            onChange={(e) => {
              updateFilter('searchQuery', e.target.value);
              setAiInterpretation(null);
            }}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-10 pr-4 py-2.5 bg-soft border border-transparent rounded-full text-sm placeholder:text-ink-3 focus:outline-none focus:border-ink-3"
          />
          {filters.searchQuery && (
            <button
              onClick={() => {
                updateFilter('searchQuery', '');
                setAiInterpretation(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* More filters button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-full text-sm font-medium transition-all btn-press ${
            isExpanded || activeFilterCount > 0
              ? 'bg-ink text-white'
              : 'bg-soft text-ink-2 hover:bg-[var(--color-divider)]'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {activeFilterCount > 0 && (
            <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-xs ${
              isExpanded ? 'bg-white text-ink' : 'bg-ink text-white'
            }`}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* AI interpretation */}
      {aiInterpretation && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-soft border border-divider rounded-xl">
            <svg className="w-4 h-4 text-ink-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs text-ink-2">{aiInterpretation}</span>
            <button
              onClick={() => setAiInterpretation(null)}
              className="ml-auto text-ink-3 hover:text-ink-2"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Time filter row */}
      <div className="px-4 pb-2">
        <span className="text-xs font-medium text-ink-2 uppercase tracking-wide">When</span>
        <div className="mt-1.5 overflow-x-auto hide-scrollbar">
          <ChipGroup>
            {timeFilters.map((tf) => (
              <Chip
                key={tf.id}
                label={tf.label}
                selected={filters.timeFilter === tf.id}
                onClick={() => handleTimeFilterClick(tf.id)}
                size="md"
              />
            ))}
          </ChipGroup>
        </div>
      </div>

      {/* Category / attribute filter pills */}
      <div className="px-4 pb-3 overflow-x-auto hide-scrollbar">
        <ChipGroup>
          {quickFilters.map((filter) => (
            <Chip
              key={filter.id}
              label={filter.label}
              selected={isQuickFilterActive(filter)}
              onClick={() => toggleQuickFilter(filter)}
              size="md"
            />
          ))}
        </ChipGroup>
      </div>

      {/* Expanded filters */}
      {isExpanded && (
        <div className="border-t border-divider">
          {/* City filters */}
          <div className="px-4 py-3 overflow-x-auto hide-scrollbar">
            <ChipGroup>
              {cityFilters.map((filter) => (
                <Chip
                  key={filter.value || 'all'}
                  label={filter.label}
                  selected={filters.city === filter.value}
                  onClick={() => updateFilter('city', filter.value)}
                  size="sm"
                />
              ))}
              {hasLocation && (
                <Chip
                  label="Near me"
                  selected={filters.nearMeOnly}
                  onClick={() => updateFilter('nearMeOnly', !filters.nearMeOnly)}
                  size="sm"
                />
              )}
            </ChipGroup>
          </div>

          {/* Neighborhood filters */}
          <div className="px-4 py-3 border-t border-divider">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-ink-2 uppercase tracking-wide">Neighborhoods</span>
              {filters.selectedNeighborhoods.length > 0 && (
                <button
                  onClick={() => updateFilter('selectedNeighborhoods', [])}
                  className="text-xs text-ink-2 hover:text-ink"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="overflow-x-auto hide-scrollbar">
              <ChipGroup>
                {POPULAR_NEIGHBORHOODS.map((neighborhood) => (
                  <Chip
                    key={neighborhood}
                    label={neighborhood}
                    selected={filters.selectedNeighborhoods.includes(neighborhood)}
                    onClick={() => toggleNeighborhood(neighborhood)}
                    size="sm"
                  />
                ))}
              </ChipGroup>
            </div>
          </div>

          {/* Category filters with colors */}
          <div className="px-4 py-3 border-t border-divider">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-ink-2 uppercase tracking-wide">Categories</span>
              {filters.selectedCategories.length > 0 && (
                <button
                  onClick={() => updateFilter('selectedCategories', [])}
                  className="text-xs text-ink-2 hover:text-ink"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="overflow-x-auto hide-scrollbar">
              <ChipGroup>
                {CATEGORIES.map((category) => {
                  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS['Other'];
                  const isSelected = filters.selectedCategories.includes(category);
                  return (
                    <button
                      key={category}
                      onClick={() => {
                        const newCategories = isSelected
                          ? filters.selectedCategories.filter(c => c !== category)
                          : [...filters.selectedCategories, category];
                        updateFilter('selectedCategories', newCategories);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all btn-press"
                      style={{
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                        color: isSelected ? 'white' : colors.primary,
                        border: `1px solid ${colors.primary}`,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: isSelected ? 'white' : colors.primary }}
                      />
                      <span>{category}</span>
                    </button>
                  );
                })}
              </ChipGroup>
            </div>
          </div>

          {/* Price range */}
          {!filters.freeOnly && (() => {
            const effectiveMax = dynamicMaxPrice ?? MAX_PRICE;
            const sliderValue = filters.priceRange[1] >= effectiveMax ? effectiveMax : filters.priceRange[1];
            const displayValue = sliderValue >= effectiveMax ? `$${effectiveMax}+` : `$${sliderValue}`;
            return (
              <div className="px-4 py-3 border-t border-divider">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-2 uppercase tracking-wide">Max Price</span>
                  <span className="text-sm text-ink">{displayValue}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={effectiveMax}
                  value={sliderValue}
                  onChange={(e) => updateFilter('priceRange', [0, Number(e.target.value)])}
                  className="w-full h-1 mt-3 bg-divider rounded-lg appearance-none cursor-pointer accent-ink"
                />
              </div>
            );
          })()}
        </div>
      )}

      {/* Bottom divider */}
      <div className="h-px bg-[var(--color-divider)]" />
    </div>
  );
}
