/**
 * Orchestrator — Main Agent (the brain)
 *
 * The Orchestrator is the top-level decision maker for the IRL data pipeline.
 * It decides what runs, in what order, and adapts based on results.
 * All other agents are sub-agents it delegates to.
 *
 * Pipeline (current → future):
 *
 *  ┌─────────────────────────────────────────────────────────────────┐
 *  │  Orchestrator (this file) — THE BRAIN                           │
 *  │                                                                 │
 *  │  VALIDATION (implemented ✅)                                    │
 *  │  └── ValidationAgent  – date, bounds, location, category       │
 *  │       └── LocationVerifierAgent – Claude tool-use geocoding     │
 *  │                                                                 │
 *  │  ENRICHMENT (stubs — implement in order of ROI)                 │
 *  │  └── VenueSearchAgent   – fills missing coords/addresses        │
 *  │  └── EventVerifierAgent – confirms real vs synthetic            │
 *  │  └── CurationAgent      – editor picks, ranking                 │
 *  │  └── UXAgent            – shortWhy / editorialWhy copy          │
 *  │  └── BrandingAgent      – images & media                        │
 *  │                                                                 │
 *  │  OBSERVABILITY (stub)                                           │
 *  └── PMAgent              – source health, suggests new sources    │
 *  └─────────────────────────────────────────────────────────────────┘
 *
 * Design principles:
 * - Cheap checks first (rules), expensive checks last (LLM)
 * - Each sub-agent is independently testable
 * - The Orchestrator can skip agents based on cost/time budgets
 * - ValidationAgent is mandatory; enrichment agents are optional
 */

import type { IRLEvent } from '../types.js';
import { ValidationAgent } from './validation-agent.js';
import { fillMissingCoordinates } from './venue-search-agent.js';
import { verifyEventBatch } from './event-verifier-agent.js';
import { hasAIEnabled as hasAIForVenueSearch } from '../ai.js';

export interface OrchestratorOptions {
  /** Run the full pipeline (validation + enrichment) */
  fullPipeline?: boolean;
  /** Run only validation (fastest, lowest cost) */
  validateOnly?: boolean;
  /** Skip the LLM-based location verifier (saves API calls) */
  skipLocationAgent?: boolean;
  /** Max events to pass to each enrichment agent */
  maxEventsPerAgent?: number;
}

export interface OrchestratorResult {
  events: IRLEvent[];
  agentsRun: string[];
  summary: Record<string, unknown>;
}

export class OrchestratorAgent {
  /**
   * Run the pipeline. The Orchestrator decides what to call and in what order.
   *
   * Modes:
   *  validateOnly  → ValidationAgent only (date + bounds + location + category)
   *  fullPipeline  → ValidationAgent + all implemented enrichment agents
   *  default       → same as validateOnly until enrichment agents are implemented
   */
  async run(
    events: IRLEvent[],
    options: OrchestratorOptions = {}
  ): Promise<OrchestratorResult> {
    const agentsRun: string[] = [];
    const summary: Record<string, unknown> = {};
    let current = events;

    console.log(`\n🎭 Orchestrator: starting pipeline (${events.length} events in)...`);

    // ── VALIDATION (always runs) ──────────────────────────────────────
    const validator = new ValidationAgent();
    const validationResult = await validator.run(current, {
      skipLocationAgent: options.skipLocationAgent ?? false,
    });
    current = validationResult.events;
    agentsRun.push('ValidationAgent');
    summary.validation = validationResult.report;

    // ── ENRICHMENT ────────────────────────────────────────────────────
    if (options.fullPipeline || (!options.skipLocationAgent && hasAIForVenueSearch())) {
      // VenueSearchAgent: fills lat/lng for events missing coordinates
      const venueResult = await fillMissingCoordinates(current, {
        max: options.maxEventsPerAgent ?? 30,
      });
      current = venueResult.events;
      agentsRun.push('VenueSearchAgent');
      summary.venueSearch = { filled: venueResult.filled, notFound: venueResult.notFound };
    }

    if (options.fullPipeline) {
      // 2. EventVerifierAgent: web-search to confirm events are real
      //    Impact: high — removes cancelled events, surfaces unverified ones
      //    Cost: medium-high (1 search per suspicious event, cached 7 days)
      const verifyResult = await verifyEventBatch(current, {
        max: options.maxEventsPerAgent ?? 20,
      });
      current = verifyResult.events;
      agentsRun.push('EventVerifierAgent');
      summary.eventVerifier = verifyResult.report;
      //
      // 3. CurationAgent: sets editorPick, scores novelty/relevance
      //    Impact: medium — improves app UX
      //    Cost: low (batch classification)
      //
      // const { CurationAgent } = await import('./curation-agent.js');
      // current = await new CurationAgent().run(current);
      // agentsRun.push('CurationAgent');
      //
      // 4. UXAgent: generates shortWhy / editorialWhy per event
      //    Impact: medium — better app copy
      //    Cost: medium (1 call per ~10 events batched)
      //
      // const { UXAgent } = await import('./ux-agent.js');
      // current = await new UXAgent().run(current);
      // agentsRun.push('UXAgent');
    }

    console.log(`\n🎭 Orchestrator done. Ran: [${agentsRun.join(', ')}]`);
    console.log(`   ${events.length} in → ${current.length} out\n`);

    return { events: current, agentsRun, summary };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-AGENT INTERFACE CONTRACTS (stubs)
// Implement each by extending BaseAgent and adding to this file's exports.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * VenueSearchAgent
 * Given an event with missing/partial location data, finds the real venue.
 * Tools: search_web, geocode_address, lookup_venue_db
 * Next to implement.
 */
export interface VenueSearchAgentContract {
  run(events: IRLEvent[], opts?: { max?: number }): Promise<IRLEvent[]>;
}

/**
 * EventVerifierAgent
 * Confirms events are real (not synthetic) via web search.
 * Tools: search_web, fetch_page
 * Replaces the static VERIFIED_SOURCES list with per-event verification.
 */
export interface EventVerifierAgentContract {
  run(events: IRLEvent[]): Promise<IRLEvent[]>;
}

/**
 * CurationAgent
 * Scores and ranks events. Sets editorPick on the best ones.
 * Tools: get_event_history, get_neighborhood_profile
 */
export interface CurationAgentContract {
  run(events: IRLEvent[]): Promise<IRLEvent[]>;
}

/**
 * UXAgent
 * Generates shortWhy (1 line) and editorialWhy (2-4 lines).
 * Replaces batchGenerateEditorial() in ai.ts.
 */
export interface UXAgentContract {
  run(events: IRLEvent[]): Promise<IRLEvent[]>;
}

/**
 * BrandingAgent
 * Assigns images: event image → venue image → Unsplash by vibe.
 */
export interface BrandingAgentContract {
  run(events: IRLEvent[]): Promise<IRLEvent[]>;
}

/**
 * PMAgent (runs weekly, not per-scrape)
 * Monitors source health, flags stale scrapers, suggests new IG accounts.
 * Tools: read_scrape_history, check_source_url, search_web
 */
export interface PMAgentContract {
  analyzeSourceHealth(runHistory: unknown[]): Promise<{
    staleSources: string[];
    suggestedNewSources: string[];
    healthReport: string;
  }>;
}
