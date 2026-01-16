# Event Curation Guide

This guide explains how to add and curate events for IRL.

## Event Data Structure

Events are stored in JSON files in `src/data/`:
- `events.miami.json` - Miami events
- `events.fll.json` - Fort Lauderdale events

## Adding a New Event

### Required Fields

```json
{
  "id": "unique-id",           // Unique identifier (e.g., "mia-001")
  "title": "Event Title",       // Clear, concise title
  "startAt": "2026-01-20T19:00:00-05:00",  // ISO 8601 with timezone offset
  "timezone": "America/New_York",
  "neighborhood": "Wynwood",    // See neighborhood list below
  "lat": 25.8012,              // Latitude (null if unknown)
  "lng": -80.1998,             // Longitude (null if unknown)
  "city": "Miami",             // "Miami" or "Fort Lauderdale"
  "tags": ["live-music", "local-favorite"],  // At least 1 tag
  "category": "Music",          // See category list below
  "isOutdoor": true,           // Boolean
  "shortWhy": "One-line hook that makes people want to go.",
  "editorialWhy": "2-5 sentences explaining why this event is worth attending. Be specific about what makes it special.",
  "description": "Standard description of the event with practical details."
}
```

### Optional Fields

```json
{
  "endAt": "2026-01-20T22:00:00-05:00",
  "venueName": "Ball & Chain",
  "address": "1513 SW 8th St, Miami, FL 33135",
  "priceLabel": "Free",        // "Free", "$", "$$", or "$$$"
  "source": {
    "name": "Website Name",
    "url": "https://..."
  },
  "image": "https://...",
  "editorPick": true           // Mark as editor's pick for boost
}
```

## Categories

- Food & Drink
- Music
- Culture
- Fitness
- Outdoors
- Nightlife
- Art
- Community
- Sports
- Wellness

## Tags

Use lowercase with hyphens:

**Music/Entertainment:**
- live-music, dj, jazz, electronic, hip-hop, indie, latin, comedy, theater

**Food & Drink:**
- happy-hour, brunch, rooftop, wine-tasting, craft-beer, cocktails, food-market, outdoor-dining

**Activities:**
- yoga, running, cycling, fitness-class, meditation, workshop

**Location:**
- beach, park, waterfront, rooftop

**Event Type:**
- free-event, family-friendly, dog-friendly, networking, pop-up, seasonal, new-opening

**Vibe:**
- local-favorite, sunset, sunrise

## Neighborhoods

### Miami
- Wynwood
- Brickell
- Design District
- South Beach
- Coconut Grove
- Little Havana
- Midtown
- Downtown Miami
- Edgewater
- Coral Gables
- Key Biscayne
- Little Haiti
- Allapattah
- Overtown

### Fort Lauderdale
- Las Olas
- Downtown FLL
- Fort Lauderdale Beach
- Flagler Village
- Victoria Park
- Wilton Manors
- Harbor Beach
- Rio Vista
- Lauderdale-By-The-Sea

## Writing Guidelines

### shortWhy (max 100 chars)
- Hook that creates FOMO
- Be specific, not generic
- Good: "The real Little Havana salsa scene, not the tourist trap version."
- Bad: "Great salsa dancing event."

### editorialWhy (max 500 chars)
- Explain what makes it special
- Include insider tips
- Mention what to expect
- Good: "This 1930s venue survived the neighborhood's changes and now hosts the city's best live salsa. Free salsa lessons at 8pm if you're nervous. The mojitos are excellent."

### description
- Practical details
- What's included
- Any requirements

## Validation

Run the validation script before committing:

```bash
npx tsx curation/validate.ts
```

This checks:
- Required fields are present
- Dates are valid ISO 8601
- Coordinates are valid
- Tags use allowed values
- Text length limits

## Editor's Picks

Mark exceptional events with `"editorPick": true` to:
- Add visual indicator in feed
- Boost ranking score by 10 points

Use sparingly - only for truly outstanding events.

## Time Considerations

- Events in the past are automatically filtered out
- Add events at least a few days before they happen
- For recurring events, add the next occurrence

## Getting Coordinates

Use Google Maps:
1. Search for venue
2. Right-click and select "What's here?"
3. Copy coordinates (lat, lng)

Or set `lat: null, lng: null` if unavailable (event won't appear on map but will show in feed).
