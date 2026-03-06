# Partiful

> Semi-private events, tastemaker layer

## Access Method

**No public API.** Partiful is an invitation-based event platform — events are created by hosts and shared via direct links. There is no public event discovery feed or search functionality.

**Web scraping approach:**
- Individual event pages are accessible via direct URL (e.g., `partiful.com/e/{event-id}`)
- Event pages are React/Next.js rendered — may require JavaScript execution
- **No browsable event listing or search** — you must know the event URL
- No anti-bot measures observed on individual pages (they're designed to be shared)
- However, there's no programmatic way to discover events

**The fundamental challenge:** Partiful events are semi-private by design. Hosts share links with their network. There is no "Partiful Miami events" page to scrape.

## Data Quality

**Variable — depends on the host.** Partiful events range from casual house parties to professionally organized cultural events.

**Available fields on event pages:**
- Event title
- Date, start time (end time sometimes)
- Location (address, sometimes just neighborhood or "TBA")
- Description (often informal, personality-driven)
- Host name and photo
- Cover image
- RSVP options (Going / Maybe / Can't Go)
- Dress code (sometimes)
- Guest list visibility settings

**Strengths:**
- Captures events that appear nowhere else (house parties, private dinners, rooftop gatherings)
- "Tastemaker" signal — Partiful is popular with creative/cultural communities in Miami
- Host-curated descriptions are authentic and personality-driven

**Weaknesses:**
- No structured data beyond basic fields
- Location is often vague ("Wynwood" instead of a full address)
- No price/ticket information (most Partiful events are free/invite-only)
- No genre/category taxonomy
- Events may be intentionally private — hosts may not want them aggregated

## Rate Limits

N/A — no API and no discoverable event listing to scrape.

## ToS Risks

**Risk level: HIGH (for automated collection) / LOW (for user submissions)**

- Partiful events are often semi-private — aggregating them without host consent raises privacy concerns
- No ToS language specifically about scraping (small company), but the platform's ethos is about controlled sharing
- Hosts who share events on Partiful expect to control their audience
- **Ethical consideration:** Even if technically feasible, aggregating Partiful events without host consent would violate the platform's social contract

## Recommended Approach

**Do not scrape Partiful.** Instead, use it as a **submission source**:

1. **Partiful URL import in submission form:**
   - Allow event submitters to paste a Partiful link
   - Parse the event page for title, date, location, description, image
   - Pre-fill the submission form with parsed data
   - Submitter (ideally the host) opts in to having their event appear on IRL

2. **Tastemaker partnerships:**
   - Identify 10-20 Miami "tastemakers" who regularly host events on Partiful
   - Partner with them: they share their Partiful links with IRL, IRL gives them a "Tastemaker" badge
   - This creates a curated, consent-based pipeline of high-quality semi-private events

3. **Trust tier:** Events sourced via Partiful should be `submitted_verified` (host opted in) or `submitted_unverified` (third-party submitted the link).

4. **Privacy controls:** Always allow hosts to request removal. Include a "This is my event and I want it removed" flow.

## Priority: Low

Partiful is valuable as a concept (tastemaker layer, events that appear nowhere else) but impractical as an automated data source. The right approach is partnership-based and consent-driven, which makes it a Phase 2 initiative after the core ingestion pipeline is built.
