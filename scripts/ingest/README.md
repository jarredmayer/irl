# IRL Ingestion Pipeline

Runs on your always-on PC. Fetches events, normalizes them,
and pushes updated JSON to GitHub. Vercel auto-deploys.

## Setup (run once on your PC)

1. Clone the repo:
   ```
   git clone https://github.com/jarredmayer/irl.git
   cd irl/scripts/ingest
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Copy and fill in environment variables:
   ```
   copy .env.example .env
   ```
   (edit .env with your API keys)

4. Test it manually:
   ```
   node index.js
   ```

5. Schedule it to run every 3 hours:

   **Windows Task Scheduler:**
   - Open Task Scheduler
   - Create Basic Task
   - Trigger: Daily, repeat every 3 hours
   - Action: Start a program
   - Program: node
   - Arguments: C:\path\to\irl\scripts\ingest\index.js
   - Start in: C:\path\to\irl\scripts\ingest

   **OR using PM2 (recommended):**
   ```
   npm install -g pm2
   pm2 start index.js --name irl-ingest --cron "0 */3 * * *"
   pm2 save
   pm2 startup
   ```

## API Keys needed

- **GITHUB_TOKEN**: github.com/settings/tokens
  Scopes needed: repo (full)

- **EVENTBRITE_API_KEY**: eventbrite.com/platform/api
  Free tier sufficient

- **ANTHROPIC_API_KEY**: anthropic.com
  Optional — for smarter categorization

## What it does

1. Fetches from Eventbrite API (Miami, FTL, Palm Beach)
2. Fetches from RSS feeds (Timeout Miami, miami.com)
3. Normalizes all events to IRL schema
4. Merges with existing events (preserves manually added ones)
5. Deduplicates by title + date
6. Filters to next 14 days only
7. Writes to public/data/events.json
8. Commits and pushes to GitHub
9. Vercel auto-deploys the updated frontend

## Event Schema

Events are normalized to match this schema:

```json
{
  "id": "fd70a4ff1be7c240",
  "title": "Event Title",
  "startAt": "2026-05-16T11:00:00",
  "endAt": "2026-05-16T13:00:00",
  "timezone": "America/New_York",
  "venueName": "Venue Name",
  "address": "123 Main St, Miami, FL 33130",
  "neighborhood": "Downtown Miami",
  "lat": 25.7743,
  "lng": -80.1963,
  "city": "Miami",
  "tags": ["art-gallery", "museum"],
  "category": "Culture",
  "priceLabel": "Free",
  "isOutdoor": true,
  "shortWhy": "Culture at Venue Name.",
  "editorialWhy": "Full description...",
  "description": "Raw description",
  "ticketUrl": "https://...",
  "source": {
    "name": "SourceName",
    "url": "https://..."
  },
  "image": "https://...",
  "editorPick": false,
  "venueId": "venue123",
  "addedAt": "2026-03-06T14:01:56.925Z"
}
```

## Troubleshooting

**Script crashes on startup:**
- Make sure you ran `npm install` in this directory
- Check that .env file exists and has valid keys

**No events fetched:**
- Eventbrite API key might be invalid or rate limited
- RSS feeds might be temporarily down

**Git push fails:**
- Check GITHUB_TOKEN has repo scope
- Make sure you're on the main branch

**Events not showing in app:**
- Check Vercel deployment logs
- Verify events.json was updated correctly
