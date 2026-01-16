# IRL - Local Events in Miami & Fort Lauderdale

A mobile-first PWA for discovering curated local events in Miami and Fort Lauderdale. Built with React, TypeScript, and Tailwind CSS.

## Features

- **Curated Feed** - Hand-picked events ranked by timing, proximity, and your interests
- **Interactive Map** - Leaflet-powered map with clustered pins and event previews
- **Weather-Aware** - Weather context affects ranking (outdoor events adjusted for rain)
- **Geolocation** - Distance calculations and "near me" filtering
- **Offline-First** - Events and preferences stored locally
- **Calendar Integration** - Download .ics files or open in Google Calendar
- **Directions** - Deep links to Apple Maps, Google Maps, or Waze

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Routing:** React Router v7
- **Styling:** Tailwind CSS
- **Maps:** Leaflet + react-leaflet + leaflet.markercluster
- **Weather:** Open-Meteo API (free, no key required)
- **Dates:** date-fns + date-fns-tz
- **Validation:** Zod
- **Build:** Vite
- **Deploy:** GitHub Pages

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/irl.git
cd irl

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development

```bash
# Run dev server
npm run dev

# Type check
npm run build

# Lint
npm run lint

# Validate event data
npx tsx curation/validate.ts
```

### Building for Production

```bash
npm run build
```

Static files are output to `./dist` for deployment.

## Project Structure

```
irl/
├── src/
│   ├── components/      # UI components organized by feature
│   │   ├── layout/      # AppShell, Header, BottomNav
│   │   ├── feed/        # FeedView, EventCard, FilterBar
│   │   ├── map/         # MapView, MarkerCluster
│   │   ├── detail/      # EventDetail, ActionButtons
│   │   ├── saved/       # SavedView
│   │   ├── preferences/ # PreferencesView
│   │   └── ui/          # Chip, Toggle, BottomSheet, etc.
│   ├── data/            # Event JSON files and Zod schema
│   ├── hooks/           # React hooks (useEvents, useWeather, etc.)
│   ├── services/        # Business logic (ranking, calendar, etc.)
│   ├── utils/           # Helper functions
│   ├── constants/       # Tags, categories, defaults
│   └── types/           # TypeScript type definitions
├── curation/            # Event curation guide and validation
└── .github/workflows/   # GitHub Actions for deployment
```

## Adding Events

See [curation/CURATION.md](curation/CURATION.md) for the complete guide.

Quick start:

1. Add events to `src/data/events.miami.json` or `src/data/events.fll.json`
2. Run validation: `npx tsx curation/validate.ts`
3. Commit and push

## Deployment

The app auto-deploys to GitHub Pages on push to `main` via GitHub Actions.

Manual deployment:

```bash
npm run build
# Upload ./dist to your static host
```

### GitHub Pages Setup

1. Go to repo Settings → Pages
2. Set Source to "GitHub Actions"
3. Push to main branch to trigger deployment

## Configuration

### Environment

The app uses client-side APIs only:

- **Open-Meteo:** Weather data (free, no API key)
- **OpenStreetMap:** Map tiles (free, attribution required)
- **Browser Geolocation:** Location access (user permission required)

### Customization

- **Base path:** Update `base` in `vite.config.ts` for different deploy paths
- **Default location:** Update `MIAMI_CENTER` in `src/constants/index.ts`
- **Tags/Categories:** Update arrays in `src/constants/index.ts`

## License

MIT

## Acknowledgments

- Map tiles by [OpenStreetMap](https://www.openstreetmap.org/)
- Weather data by [Open-Meteo](https://open-meteo.com/)
- Icons from [Heroicons](https://heroicons.com/)
