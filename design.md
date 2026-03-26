# IRL Design Fidelity Spec

> This file encodes IRL's design intent — the "tribal knowledge" that makes the product
> feel coherent. Every Claude Code prompt that touches UI should read this file first.
> It lives at the repo root so it's always in context.

## Brand Identity

IRL is a local events discovery app for South Florida (Miami, Fort Lauderdale, Palm Beach).
The brand voice is **terse, local, unsentimental** — a plugged-in local friend, not a concierge
or tourist board. Minimal, cool, understated with playful streetwise energy.

### Typography Stack

|Role               |Font       |Usage                                                                                                      |
|-------------------|-----------|-----------------------------------------------------------------------------------------------------------|
|Wordmark only      |Bodoni Moda|The "IRL" logo. Never used for body text or headings. Uses `font-optical-sizing: auto`.                    |
|Editorial / display|Lora       |Event titles, section headings, hero text. Serif warmth. Use for anything the user *reads*.                |
|UI chrome          |Jost       |Chips, buttons, labels, metadata, nav, timestamps. Clean geometric sans. Use for anything the user *scans*.|

**Rule:** If it's a noun (event name, venue, neighborhood) → Lora. If it's a verb or label (Save, Filter, See All) → Jost.

### Color System

**Core palette — use these for 95% of the UI:**

|Token    |Hex      |Role                                                |
|---------|---------|----------------------------------------------------|
|`ink`    |`#0E0E0E`|Primary text, active states, buttons                |
|`ink-2`  |`#5C5856`|Secondary text (venue names, descriptions)          |
|`ink-3`  |`#8A8682`|Tertiary text (timestamps, metadata, inactive chips)|
|`bg-soft`|`#F7F6F4`|Page background, card backgrounds                   |
|`white`  |`#FFFFFF`|Card surfaces, modals                               |
|`divider`|`#E5E5E5`|Borders, separators                                 |
|`mustard`|`#C4A040`|Yourcast accent only                                |

**Category accents — use sparingly for visual differentiation:**

|Category                     |Token     |Hex      |Maps to       |
|-----------------------------|----------|---------|--------------|
|Music / Nightlife            |`burgundy`|`#7A2D3A`|Deep warm red |
|Outdoors / Fitness / Wellness|`teal`    |`#2E6560`|Muted green   |
|Art / Culture                |`mauve`   |`#7A5C72`|Dusty purple  |
|Food & Drink                 |`ochre`   |`#9C6B28`|Warm gold     |
|Community / Sports / Family  |`slate-c` |`#3D5068`|Cool blue-gray|
|Comedy                       |`fig`     |`#5C4A7A`|Muted violet  |

**How to use category colors:**

- As a 4px left border on event cards
- As chip background at 12% opacity when that category filter is active
- As the "swatch dot" next to category labels
- NEVER as full card backgrounds, button fills, or large color blocks
- The overall feel should be 90% ink/white/cream with category colors as quiet signals

### Banned Words & Patterns

Never use in any copy, editorial text, Pulse output, or UI labels:

- "Discover", "Explore", "Curated for you", "Don't miss"
- "Amazing", "Incredible", "Unforgettable", "Must-see"
- "Check out", "Be sure to", "You won't want to miss"
- Exclamation marks in editorial copy (OK in user-facing UI like "Saved!")
- Emoji in editorial copy (OK in Pulse chat responses, sparingly)

## Component Patterns

### Event Card — Information Hierarchy

The card hierarchy is fixed. Do not rearrange:

```
┌─────────────────────────────────┐
│ [Image / Color Wash Fallback]   │  ← 16:10 aspect ratio
│                                 │
│  ┌─ Category swatch dot         │  ← 4px left border in category color
│  │  CATEGORY · NEIGHBORHOOD     │  ← Jost, ink-3, uppercase, 11px
│  │  Event Title                 │  ← Lora, ink, 16px, max 2 lines
│  │  Venue Name                  │  ← Jost, ink-2, 13px
│  │  SAT MAR 8 · 7 PM · Free    │  ← Jost, ink-3, 12px, uppercase
│  └──────────────────────────────│
└─────────────────────────────────┘
```

**Image rules:**

- Real scraped image → show it, no overlay
- No image available → category color wash at 8% opacity + event title in Lora centered
- Never show broken image placeholders or generic stock photos
- Unsplash/Pexels fallbacks are temporary — the goal is scraped venue/event images

### Hero Card (top of feed)

Same hierarchy as Event Card but:

- Full-bleed image, 16:9 aspect ratio
- Title overlaid on image with bottom gradient (ink → transparent)
- Title in Lora, white, 22px
- Used for: editor picks, highest-scored event of the day, "Tonight" anchor

### Filter Chips

- **Default:** `bg-white`, `border-divider`, `text-ink-3`, Jost 13px
- **Active:** `bg-ink`, `text-white` (current behavior — keep this as default)
- **Category chips specifically:** When a category filter is active, use category accent color at 12% opacity as background instead of solid ink. This provides instant visual feedback about WHAT is selected.

### Empty States

- Large icon (ink-3, 48px)
- Title in Lora, ink, 20px
- Description in Jost, ink-2, 14px, max 280px width
- Single CTA button: `bg-ink text-white rounded-full`
- Tone: direct, not apologetic. "Nothing tonight" not "Sorry, we couldn't find anything for you!"

### Bottom Sheet / Modal

- 8px top border radius
- White background
- Drag handle: 40px wide, 4px tall, `bg-ink-3`, centered, 12px from top
- Content padding: 24px horizontal, 16px vertical
- Close button: top-right, ink-3, 24px icon

## Editorial Voice (Pulse & Copy)

### Event Descriptions (shortWhy / editorialWhy)

- Max 2 sentences
- Lead with the specific thing that makes it worth going
- Include one concrete detail (artist name, dish, time, neighborhood)
- Never explain what the venue is — assume the reader is local

**Good:** "Danny Daze opens PAMMSonic for Music Week. Free, waterfront, sunset set."
**Bad:** "Join us for an exciting evening of music at the Pérez Art Museum Miami, located on the beautiful Biscayne Bay waterfront!"

### Pulse Chat Responses

- Terse but warm
- Can use 1 emoji per response if natural
- Answers the question first, adds context second
- Never suggests more than 3 options at once

## Layout & Spacing

### Feed View

- Cards have 12px gap between them
- Section headers ("Tonight", "This Weekend") in Lora, ink, 18px, 24px left padding
- Pull-to-refresh: ink spinner, no text
- Bottom safe area: 64px nav + env(safe-area-inset-bottom)

### Responsive

- Max content width: 480px, centered
- This is a mobile-first PWA — no desktop breakpoints needed
- Touch targets: minimum 44px height

## What NOT to Do

- Don't add gradients, shadows, or depth effects. The aesthetic is flat editorial print.
- Don't use rounded-lg or rounded-xl on cards. Use rounded (4px) or rounded-md (6px) max.
- Don't add animation to cards loading in. Content appears; it doesn't "slide" or "fade."
- Don't use colored backgrounds for sections. White and bg-soft only.
- Don't put category names in ALL CAPS in card bodies. Uppercase is for metadata lines only.
- Don't make Pulse feel like a chatbot. No "How can I help you today?" — it speaks when spoken to.
- Don't introduce new colors without updating this spec. Every color in the product is listed above.
