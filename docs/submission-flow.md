# Event Submission Flow

> Design for a lightweight event submission flow for artists, musicians, and venue operators.

## Overview

The submission pipeline is **completely independent** of the scraping pipeline. Submitted events enter a **review queue** and never go directly into the live event feed. This separation ensures:

1. Scraping quality is not diluted by unverified user submissions
2. Submitters get a clear expectation: "Your event will be reviewed"
3. The editorial team maintains control over what appears in the feed

## Submission Flow

```
Submitter → Submission Form → Review Queue → Verification → Live Feed
                                    ↑                ↓
                              (stays here)    (rejected with reason)
                              until reviewed
```

### Step 1: Submission Form

The form collects the enriched event schema fields. Submitters are:
- **Artists/Musicians** promoting their own shows
- **Venue Operators** posting their upcoming calendar
- **Community Organizers** for meetups, cultural events, etc.

**Required fields from submitter:**
- Title
- Date and start time
- Venue name OR address (at least one)
- Description (min 50 characters)
- Contact email

**Optional but encouraged:**
- End time
- Image URL or upload
- Ticket URL or "This is a free event" checkbox
- Price range
- Instagram handle (for verification)
- Venue website URL (for verification)
- Genre/vibe tags (from controlled vocabulary with autocomplete)
- Indoor/outdoor

**Auto-populated by system:**
- `id` — generated hash
- `addedAt` — submission timestamp
- `trustTier` — set to `submitted_unverified`
- `completenessScore` — computed from field coverage
- `city` / `neighborhood` — derived from address via geocoding
- `lat` / `lng` — derived from address via geocoding

### Step 2: Review Queue

Submissions enter a review queue with the following schema:

```typescript
export interface SubmissionQueueEntry {
  // === Submission Identity ===
  submissionId: string;                // UUID
  submittedAt: string;                 // ISO 8601
  submitterEmail: string;              // Contact email
  submitterInstagram?: string;         // For verification
  submitterVenueUrl?: string;          // For verification

  // === Event Data ===
  event: Partial<EnrichedEvent>;       // The submitted event data (partial — may be incomplete)

  // === Review State ===
  status: SubmissionStatus;
  reviewedAt?: string;                 // When reviewed
  reviewedBy?: string;                 // Reviewer identifier
  reviewNotes?: string;                // Internal notes
  rejectionReason?: string;            // Shown to submitter if rejected

  // === Verification ===
  verificationChecks: VerificationCheck[];
  verificationScore: number;           // 0–1 composite score
}

export type SubmissionStatus =
  | 'pending'                          // Awaiting review
  | 'in_review'                        // Currently being reviewed
  | 'approved'                         // Approved → pushed to live feed
  | 'rejected'                         // Rejected with reason
  | 'needs_info';                      // Sent back to submitter for more details

export interface VerificationCheck {
  type: VerificationCheckType;
  status: 'pass' | 'fail' | 'inconclusive' | 'skipped';
  details: string;
  checkedAt: string;
}

export type VerificationCheckType =
  | 'instagram_cross_reference'        // Does their Instagram mention the event?
  | 'venue_website_cross_reference'    // Does the venue website list this event?
  | 'duplicate_check'                  // Is this event already in the feed?
  | 'venue_existence_check'            // Does this venue exist at this address?
  | 'date_sanity_check'               // Is the date in the future and reasonable?
  | 'image_reverse_search'            // Is the image stolen/stock?
  | 'submitter_history'               // Has this submitter submitted before? Track record?
```

### Step 3: Verification Logic

Verification is a mix of automated checks and human review. The automated checks run immediately on submission; human review follows.

#### Automated Checks (run on submission)

1. **Duplicate Check**
   - Compare `title + date + venue` against existing events in the feed
   - Use fuzzy matching (Levenshtein distance < 3 on title, same date, same venue)
   - Result: `pass` (no duplicate), `fail` (exact duplicate), `inconclusive` (similar event found)

2. **Date Sanity Check**
   - Event date must be in the future
   - Event date must be within 6 months
   - Start time must be before end time
   - Result: `pass` or `fail` with specific reason

3. **Venue Existence Check**
   - Geocode the address
   - Verify lat/lng falls within Miami-Dade, Broward, or Palm Beach county bounds
   - Cross-reference venue name against known venue list
   - Result: `pass` (known venue), `inconclusive` (valid address, unknown venue), `fail` (invalid address)

4. **Instagram Cross-Reference** (if handle provided)
   - Fetch the submitter's recent Instagram posts/stories
   - Look for mentions of the event title, date, or venue
   - Result: `pass` (event mentioned), `inconclusive` (no mention found), `skipped` (no handle provided)

5. **Venue Website Cross-Reference** (if URL provided)
   - Fetch the venue's events/calendar page
   - Look for the event title or date on the page
   - Result: `pass` (event listed), `inconclusive` (no match), `skipped` (no URL provided)

6. **Submitter History**
   - Check if this email has submitted before
   - Track approval rate for repeat submitters
   - Result: `pass` (>80% approval rate), `inconclusive` (new submitter), `fail` (<50% approval rate)

#### Verification Score Computation

```typescript
function computeVerificationScore(checks: VerificationCheck[]): number {
  const weights: Record<VerificationCheckType, number> = {
    instagram_cross_reference: 0.25,
    venue_website_cross_reference: 0.25,
    duplicate_check: 0.15,
    venue_existence_check: 0.15,
    date_sanity_check: 0.10,
    image_reverse_search: 0.05,
    submitter_history: 0.05,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const check of checks) {
    const weight = weights[check.type] || 0;
    if (check.status === 'skipped') continue; // Don't count skipped checks

    totalWeight += weight;
    if (check.status === 'pass') weightedSum += weight;
    else if (check.status === 'inconclusive') weightedSum += weight * 0.5;
    // 'fail' adds 0
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
```

#### Human Review Decision Tree

After automated checks run, a reviewer sees:

- **Auto-approve** (verification score >= 0.8): Event is high-confidence. Reviewer does a quick glance and approves.
- **Standard review** (0.4 <= score < 0.8): Reviewer manually checks the event details, cross-references sources.
- **Flag for scrutiny** (score < 0.4): Event has red flags. Reviewer may request more info or reject.

### Step 4: Trust Tier Elevation

Events start as `submitted_unverified`. They can be elevated to `submitted_verified` when:

1. **All automated checks pass** and a human reviewer approves, OR
2. **The submitter is a known trusted submitter** (>5 prior approvals, >90% approval rate), OR
3. **The event is cross-referenced** against a scraped source (e.g., RA also lists this event)

Once elevated, the event joins the live feed with `trustTier: 'submitted_verified'`.

Events that remain `submitted_unverified` after review timeout (7 days, or event date passes) are automatically archived.

---

## Submitter Experience

### Happy Path
1. Submitter fills out the form (2-3 minutes)
2. Sees confirmation: "Thanks! Your event is under review. You'll get an email when it's approved."
3. Automated checks run in background (~30 seconds)
4. If high-confidence: auto-approved within minutes
5. If standard: reviewed within 24 hours
6. Submitter gets email: "Your event is now live on IRL!"

### Rejection Path
1. Submitter fills out the form
2. Automated checks flag issues
3. Reviewer rejects with reason: "We couldn't verify this event at the listed venue"
4. Submitter gets email with reason and option to resubmit with corrections

### Returning Submitter
- Email is remembered (via account or cookie)
- Previous submissions shown with status
- Trusted submitters (>5 approvals) get a "Verified Submitter" badge
- Verified submitters' events may be fast-tracked (auto-approve with high verification score)

---

## Rate Limiting & Abuse Prevention

- Max 5 submissions per email per day
- Max 20 submissions per email per week
- CAPTCHA or similar on the form
- Email verification on first submission
- IP-based rate limiting as fallback
- Spam detection: flag submissions with suspicious patterns (all-caps, excessive URLs, promotional language)

---

## Data Flow Diagram

```
┌─────────────────┐
│  Submission Form │
│  (React component│
│   already exists │
│   as scaffold)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Review Queue    │────▶│  Automated Checks │
│  (new data store)│     │  (verification    │
│                  │◀────│   service)        │
└────────┬────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐
│  Human Review    │
│  (admin UI or   │
│   simple dashboard)
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│Approved│ │Rejected│
│  → Live│ │  → Email│
│  Feed  │ │  submitter
└────────┘ └────────┘
```

## Existing UI Scaffold

The codebase already contains `src/components/profile/SubmitEventForm.tsx` — a form component for event submission. This should be extended to:
1. Collect the additional verification fields (Instagram handle, venue website URL)
2. Show submission status tracking
3. Integrate with the review queue backend (not yet built)
