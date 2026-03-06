# Curation Scoring Logic

> Proposal for a curation scoring function that ranks events by quality, trust, freshness, and contextual relevance.

## Overview

The curation score determines how prominently an event appears in the IRL feed. It combines multiple signals into a single score that balances editorial quality, data reliability, source diversity, and real-time context (weather).

This score operates **upstream** of the existing ranking system (`src/services/ranking.ts`), which handles time-proximity, distance, taste-matching, and feed diversity. The curation score is a **pre-filter and quality weight** that ensures low-quality or untrustworthy events don't compete equally with high-quality ones.

## Scoring Function

```
curation_score = (
    completeness_weight * completeness_score
  + freshness_weight   * freshness_score
  + trust_weight       * trust_tier_score
  + source_weight      * source_quality_score
  + weather_weight     * weather_compatibility_score
)
```

### Weights

| Component | Weight | Rationale |
|-----------|--------|-----------|
| `completeness_score` | 0.25 | Events with missing fields are less useful to users |
| `freshness_score` | 0.20 | Stale data leads to bad UX (cancelled/changed events) |
| `trust_tier_score` | 0.25 | Trustworthy sources should dominate the feed |
| `source_quality_score` | 0.20 | Local/niche sources signal authentic events |
| `weather_compatibility_score` | 0.10 | Contextual relevance for outdoor events |

All component scores are normalized to 0–1. The final `curation_score` is also 0–1.

---

## Component Definitions

### 1. Completeness Score (0–1)

Defined in the [data model spec](./data-model.md#completeness-score-computation). Measures what percentage of important fields are populated, weighted by importance.

**Key thresholds:**
- `>= 0.8`: High completeness — event is display-ready
- `0.5 – 0.8`: Moderate — usable but may lack images or pricing
- `< 0.5`: Low — likely missing venue, description, or dates; deprioritize

### 2. Freshness Score (0–1)

Defined in the [data model spec](./data-model.md#freshness-score-computation). Measures how recently the event data was verified relative to the event date.

**Key behavior:**
- Verified within 24h → 1.0
- Verified within 72h → 0.8
- Event is soon (<48h) but data is stale (>72h since verification) → 0.3
- Linear decay for older verifications

### 3. Trust Tier Score (0–1)

Maps the `trustTier` enum to a numeric score:

```typescript
const TRUST_TIER_SCORES: Record<TrustTier, number> = {
  official_api:          1.0,   // Data from official API (RA, Eventbrite, etc.)
  scraped_known_venue:   0.85,  // Scraped from known/trusted venue website
  submitted_verified:    0.75,  // User-submitted and human-verified
  scraped_unknown:       0.5,   // Scraped from unknown/generic aggregator
  submitted_unverified:  0.3,   // User-submitted, not yet verified
};
```

**Rationale:**
- Official APIs are the most reliable — structured data, maintained by the source
- Known venues (Club Space, PAMM, etc.) are trustworthy even when scraped
- Verified submissions have passed human review
- Unknown scraped sources may be stale or inaccurate
- Unverified submissions are the least trusted but still shown (just deprioritized)

### 4. Source Quality Score (0–1)

This is the "local-coded vs. tourist-trap" signal. Events sourced from niche/local sources get a boost; events that only appear on generic aggregators get a penalty.

```typescript
function computeSourceQualityScore(event: EnrichedEvent): number {
  const sourceName = event.source.name.toLowerCase();

  // Tier 1: Niche/local sources — strong local signal
  const TIER_1_SOURCES = [
    'resident advisor',
    'shotgun',
    'club space',
    'instagram sources',
    'sofarsounds',
    'luma',
    'little haiti cultural complex',
    'pamm',
    'ica miami',
    'wdna',
    'wvum',
    'culture room',
  ];

  // Tier 2: Established but broad sources
  const TIER_2_SOURCES = [
    'dice.fm',
    'bandsintown',
    'eventbrite',
    'meetup',
    'bonnet house',
    'broward center',
  ];

  // Tier 3: Generic aggregators — tourist-trap proxy
  const TIER_3_SOURCES = [
    'fever',
    'candlelight concerts',
    'hotel events',
  ];

  if (TIER_1_SOURCES.some(s => sourceName.includes(s))) return 1.0;
  if (TIER_2_SOURCES.some(s => sourceName.includes(s))) return 0.7;
  if (TIER_3_SOURCES.some(s => sourceName.includes(s))) return 0.3;

  // Default: moderate score for unknown sources
  return 0.5;
}
```

**Multi-source bonus:** If an event appears in multiple sources (detected via dedup), boost the score:
- 1 source: base score
- 2 sources: `min(1.0, base + 0.15)`
- 3+ sources: `min(1.0, base + 0.25)`

This rewards events that are listed across multiple platforms (more likely to be real and significant) while still favoring niche sources.

### 5. Weather Compatibility Score (0–1)

Only applies to outdoor events. Indoor events always get 1.0.

```typescript
function computeWeatherCompatibilityScore(
  event: EnrichedEvent,
  forecast: WeatherForecast | null
): number {
  // Indoor events are always weather-compatible
  if (!event.isOutdoor) return 1.0;

  // No forecast available — neutral score
  if (!forecast) return 0.5;

  const eventHour = findForecastHour(forecast, event.startAt);
  if (!eventHour) return 0.5;

  const { precipitationProbability, temperature } = eventHour;

  // Rain probability scoring
  let rainScore: number;
  if (precipitationProbability <= 10) rainScore = 1.0;      // Clear
  else if (precipitationProbability <= 30) rainScore = 0.8;  // Slight chance
  else if (precipitationProbability <= 50) rainScore = 0.5;  // Coin flip
  else if (precipitationProbability <= 70) rainScore = 0.3;  // Likely rain
  else rainScore = 0.1;                                       // Almost certain rain

  // Temperature comfort scoring (Miami-calibrated)
  let tempScore: number;
  if (temperature >= 72 && temperature <= 85) tempScore = 1.0;      // Ideal Miami weather
  else if (temperature >= 65 && temperature <= 90) tempScore = 0.8;  // Comfortable
  else if (temperature >= 60 && temperature <= 95) tempScore = 0.5;  // Tolerable
  else tempScore = 0.3;                                               // Extreme

  // Weighted combination: rain matters more than temperature
  return rainScore * 0.7 + tempScore * 0.3;
}
```

**Integration with existing weather system:** The app already uses Open-Meteo for weather data (`src/services/weather.ts`) and has `HourlyWeather` forecasts. The curation score can reuse this data.

---

## Final Score Computation

```typescript
function computeCurationScore(
  event: EnrichedEvent,
  forecast: WeatherForecast | null
): number {
  const completeness = event.completenessScore;
  const freshness = event.freshnessScore;
  const trust = TRUST_TIER_SCORES[event.trustTier];
  const sourceQuality = computeSourceQualityScore(event);
  const weather = computeWeatherCompatibilityScore(event, forecast);

  const score =
      0.25 * completeness
    + 0.20 * freshness
    + 0.25 * trust
    + 0.20 * sourceQuality
    + 0.10 * weather;

  return Math.round(score * 1000) / 1000; // 3 decimal places
}
```

---

## Thresholds and Feed Behavior

| Curation Score | Behavior |
|---------------|----------|
| `>= 0.7` | Fully visible in feed. Eligible for editor pick and featured placement. |
| `0.5 – 0.7` | Visible in feed but lower in ranking. Not eligible for featured placement. |
| `0.3 – 0.5` | Visible only in "Show more" or filtered search. Not shown in default feed. |
| `< 0.3` | Hidden from users. Flagged for review or automatic removal. |

---

## Integration with Existing Ranking

The curation score is **not a replacement** for the existing ranking system. It is a **pre-ranking quality gate** and a **score modifier**:

1. **Pre-filter:** Events with `curation_score < 0.3` are excluded from the feed entirely
2. **Score modifier:** The existing `scoreEvent()` function in `ranking.ts` can incorporate the curation score as an additional factor:

```typescript
// In ranking.ts scoreEvent():
const curationBoost = (event.curationScore - 0.5) * 20;
// curationScore 0.7 → +4 points
// curationScore 0.5 → +0 points
// curationScore 0.3 → -4 points
```

This keeps curation influence proportional (~4-8 points) alongside the existing scoring factors (time: 40, distance: 25, taste: 20, editor: 10, weather: 10).

---

## Source Quality Tier Updates

The source tier lists should be maintained as a **configuration file**, not hardcoded. As new sources are added to the ingestion pipeline, they should be classified into a tier:

```json
{
  "tier1_local_niche": [
    "resident_advisor", "shotgun", "club_space", "instagram_sources",
    "sofarsounds", "luma", "pamm", "ica_miami", "bass_museum",
    "little_haiti_cultural_complex", "wdna", "wvum", "culture_room",
    "wynwood_bid", "mimo_district"
  ],
  "tier2_established_broad": [
    "dice_fm", "bandsintown", "eventbrite", "meetup",
    "bonnet_house", "broward_center", "brickell_city_centre",
    "new_times_miami", "partiful"
  ],
  "tier3_generic_aggregator": [
    "fever", "candlelight_concerts", "hotel_events",
    "generic_tourist_sites"
  ]
}
```

---

## Open Questions for Implementation

1. **Weight tuning:** The weights (0.25/0.20/0.25/0.20/0.10) are starting values. They should be tuned based on user engagement data (saves, clicks, shares) once the system is live.

2. **Weather forecast horizon:** Open-Meteo provides 7-day hourly forecasts. Events further out than 7 days won't have weather data — the weather component defaults to 0.5 (neutral).

3. **Multi-source detection:** Dedup already runs in the scraper. The multi-source bonus requires tracking which sources each event was seen in, even after dedup merges them into a single record.

4. **Source tier auditing:** Source tiers should be reviewed quarterly. A source that starts producing low-quality data should be demoted.

5. **A/B testing:** Consider running the curation score as an A/B test — show some users the curated feed and others the existing ranking — to measure impact on engagement.
