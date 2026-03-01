/**
 * Orchestrator — Main Agent (the brain)
 *
 * The Orchestrator is the top-level decision maker for the IRL data pipeline.
 * It decides what runs, in what order, and adapts based on results.
 * All other agents are sub-agents it delegates to.
 *
 * Pipeline:
 *
 *  ┌─────────────────────────────────────────────────────────────────┐
 *  │  Orchestrator (this file) — THE BRAIN                           │
 *  │                                                                 │
 *  │  VALIDATION (always runs)                                       │
 *  │  └── ValidationAgent  – date, bounds, location, category       │
 *  │       └── LocationVerifierAgent – Claude tool-use geocoding     │
 *  │                                                                 │
 *  │  ENRICHMENT                                                     │
 *  │  └── VenueSearchAgent   – fills missing coords/addresses        │
 *  │  └── EventVerifierAgent – confirms real vs synthetic (full)     │
 *  │  └── CurationAgent      – editor picks, scoring (full)         │
 *  │  └── UXAgent            – shortWhy / editorialWhy copy (full)  │
 *  │  └── BrandingAgent      – images & media (always, zero cost)   │
 *  │                                                                 │
 *  │  OBSERVABILITY (run separately, weekly)                         │
 *  └── PMAgent              – source health, suggests new sources    │
 *  └─────────────────────────────────────────────────────────────────┘
 *
 * Modes:
 *  validateOnly  → ValidationAgent + BrandingAgent only (fastest, no LLM enrichment)
 *  fullPipeline  → All agents (comprehensive, higher API cost)
 *  default       → Validation + VenueSearch (if AI available) + BrandingAgent
 *
 * Design principles:
 * - Cheap checks first (rules), expensive checks last (LLM)
 * - BrandingAgent always runs — it's deterministic, zero API cost
 * - Each sub-agent is independently testable
 * - The Orchestrator can skip agents based on cost/time budgets
 */

import type { IRLEvent } from '../types.js';
import { ValidationAgent } from './validation-agent.js';
import { fillMissingCoordinates } from './venue-search-agent.js';
import { verifyEventBatch } from './event-verifier-agent.js';
import { CurationAgent } from './curation-agent.js';
import { UXAgent } from './ux-agent.js';
import { BrandingAgent } from './branding-agent.js';
import { hasAIEnabled as hasAIForVenueSearch } from '../ai.js';

export { PMAgent } from './pm-agent.js';

export interface OrchestratorOptions {
  /** Run the full pipeline (validation + all enrichment agents) */
  fullPipeline?: boolean;
  /** Run only validation + branding (fastest; no VenueSearch, EventVerifier, Curation, UX) */
  validateOnly?: boolean;
  /** Skip the LLM-based location verifier within ValidationAgent */
  skipLocationAgent?: boolean;
  /** Max events to pass to each enrichment agent */
  maxEventsPerAgent?: number;
  /** Run EventVerifier without requiring fullPipeline (use with --verify-events flag) */
  verifyEvents?: boolean;
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
   *  validateOnly  → ValidationAgent + BrandingAgent (date/bounds/location/category + images)
   *  fullPipeline  → Validation + VenueSearch + EventVerifier + Curation + UX + Branding
   *  default       → Validation + VenueSearch (if AI available) + BrandingAgent
   */
  async run(
    events: IRLEvent[],
    options: OrchestratorOptions = {}
  ): Promise<OrchestratorResult> {
    const agentsRun: string[] = [];
    const summary: Record<string, unknown> = {};
    let current = events;

    console.log(`\n🎭 Orchestrator: starting pipeline (${events.length} events in)...`);
    console.log(`   Mode: ${options.fullPipeline ? 'fullPipeline' : options.validateOnly ? 'validateOnly' : 'default'}`);

    // ── VALIDATION (always runs) ──────────────────────────────────────────────
    const validator = new ValidationAgent();
    const validationResult = await validator.run(current, {
      skipLocationAgent: options.skipLocationAgent ?? false,
    });
    current = validationResult.events;
    agentsRun.push('ValidationAgent');
    summary.validation = validationResult.report;

    // ── VENUE SEARCH (skipped in validateOnly) ────────────────────────────────
    if (!options.validateOnly && (options.fullPipeline || hasAIForVenueSearch())) {
      const venueResult = await fillMissingCoordinates(current, {
        max: options.maxEventsPerAgent ?? 150,
      });
      current = venueResult.events;
      agentsRun.push('VenueSearchAgent');
      summary.venueSearch = {
        filled: venueResult.filled,
        notFound: venueResult.notFound,
        dbHits: venueResult.dbHits,
      };
    }

    // ── EVENT VERIFICATION (fullPipeline or --verify-events flag) ────────────
    //    Impact: high — removes cancelled events, surfaces unverified ones
    //    Cost: medium (1 DuckDuckGo search per event, cached 7d / 3d for IG)
    if (options.fullPipeline || options.verifyEvents) {
      const verifyResult = await verifyEventBatch(current, {
        max: options.maxEventsPerAgent ?? 20,
      });
      current = verifyResult.events;
      agentsRun.push('EventVerifierAgent');
      summary.eventVerifier = verifyResult.report;
    }

    // ── CURATION + UX (fullPipeline only) ────────────────────────────────────
    if (options.fullPipeline) {
      // CurationAgent: score events, set editorPick on top 5–10%
      //    Impact: medium — improves app UX, gives users guidance
      //    Cost: low (batch scoring, Haiku, 7-day cache)
      const curator = new CurationAgent();
      const curationResult = await curator.run(current);
      current = curationResult.events;
      agentsRun.push('CurationAgent');
      summary.curation = {
        editorPicks: current.filter((e) => e.editorPick).length,
        newPicks: curationResult.newPicks,
        cacheHits: curationResult.cacheHits,
      };

      // UXAgent: generate shortWhy + editorialWhy for events with generic copy
      //    Impact: medium — better app copy, more engaging editorial voice
      //    Cost: medium (batch generation, Sonnet, 14-day cache)
      const uxAgent = new UXAgent();
      const uxResult = await uxAgent.run(current);
      current = uxResult.events;
      agentsRun.push('UXAgent');
      summary.ux = { updated: uxResult.updated, cacheHits: uxResult.cacheHits };
    }

    // ── BRANDING (always runs — deterministic, zero API cost) ─────────────────
    //    Waterfall: event.image → venue.imageUrl → vibe tag → category fallback
    const branding = new BrandingAgent();
    current = branding.run(current);
    agentsRun.push('BrandingAgent');
    summary.branding = { eventsWithImages: current.filter((e) => !!e.image).length };

    console.log(`\n🎭 Orchestrator done. Ran: [${agentsRun.join(', ')}]`);
    console.log(`   ${events.length} in → ${current.length} out\n`);

    return { events: current, agentsRun, summary };
  }
}
