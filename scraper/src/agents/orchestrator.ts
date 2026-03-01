/**
 * Orchestrator Agent
 *
 * The top-level agent that coordinates the full IRL data pipeline.
 * Unlike the legacy EventAggregator (which is a fixed batch pipeline),
 * the Orchestrator reasons about what needs to happen, decides which
 * sub-agents to invoke, and adapts based on intermediate results.
 *
 * Agent roster:
 * ┌─────────────────────────────────────────────────────────────┐
 * │  Orchestrator (this file)                                   │
 * │  └── decides what to run and in what order                  │
 * │                                                             │
 * │  ScraperAgent        – fetches raw events from sources      │
 * │  VenueSearchAgent    – resolves venue coords & details      │
 * │  LocationVerifier    – corrects misplaced coordinates ✅    │
 * │  EventVerifier       – validates real vs synthetic events   │
 * │  CurationAgent       – selects & ranks editorial picks      │
 * │  UXAgent             – generates descriptions for the app   │
 * │  BrandingAgent       – finds/assigns images & media         │
 * │  PMAgent             – tracks source health & suggests new  │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Current status:
 * - LocationVerifier: IMPLEMENTED (see location-verifier.ts)
 * - All others: STUB — interfaces defined, implementation pending
 *
 * Usage (future):
 *   const orchestrator = new OrchestratorAgent();
 *   const events = await orchestrator.run({ date: new Date() });
 */

import type { IRLEvent } from '../types.js';
import { agentVerifyLocations } from './location-verifier.js';

export interface OrchestratorOptions {
  /** Run all agents end-to-end */
  fullPipeline?: boolean;
  /** Only run location verification on existing events */
  locationVerifyOnly?: boolean;
  /** Max events to process per agent (cost control) */
  maxEventsPerAgent?: number;
}

export interface OrchestratorResult {
  events: IRLEvent[];
  agentsRun: string[];
  summary: Record<string, unknown>;
}

export class OrchestratorAgent {
  /**
   * Run the agentic pipeline.
   * Currently supports locationVerifyOnly mode.
   * fullPipeline will be enabled as each agent is implemented.
   */
  async run(
    existingEvents: IRLEvent[],
    options: OrchestratorOptions = {}
  ): Promise<OrchestratorResult> {
    const agentsRun: string[] = [];
    const summary: Record<string, unknown> = {};
    let events = existingEvents;

    console.log('\n🎭 Orchestrator Agent starting...');

    if (options.locationVerifyOnly || options.fullPipeline) {
      console.log('  → Delegating to LocationVerifierAgent...');
      const result = await agentVerifyLocations(events, {
        maxEvents: options.maxEventsPerAgent ?? 30,
      });
      events = result.events;
      agentsRun.push('LocationVerifierAgent');
      summary.locationVerification = result.report;
    }

    // Future agents (stubs — uncomment as implemented):
    // if (options.fullPipeline) {
    //   events = await new ScraperAgent().run(events);
    //   agentsRun.push('ScraperAgent');
    //
    //   events = await new VenueSearchAgent().run(events);
    //   agentsRun.push('VenueSearchAgent');
    //
    //   events = await new EventVerifierAgent().run(events);
    //   agentsRun.push('EventVerifierAgent');
    //
    //   events = await new CurationAgent().run(events);
    //   agentsRun.push('CurationAgent');
    //
    //   events = await new UXAgent().run(events);
    //   agentsRun.push('UXAgent');
    //
    //   events = await new BrandingAgent().run(events);
    //   agentsRun.push('BrandingAgent');
    // }

    console.log(`  ✅ Orchestrator done. Ran: ${agentsRun.join(', ') || 'none'}`);
    return { events, agentsRun, summary };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT STUBS
// Each stub defines the interface and purpose. Implement by extending BaseAgent.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * VenueSearchAgent
 * Given an event title + partial address, finds the correct venue
 * in the Miami/FLL area using web search + Places-style data.
 * Fills in missing venueName, address, lat, lng, venueId.
 */
export interface VenueSearchAgentStub {
  resolveVenue(eventTitle: string, hint: string, city: string): Promise<{
    venueName: string;
    address: string;
    lat: number;
    lng: number;
  } | null>;
}

/**
 * EventVerifierAgent
 * Classifies events as real vs synthetic.
 * Uses web search to confirm an event actually exists before including it.
 * Replaces the current static VERIFIED_SOURCES / SYNTHETIC_SOURCES lists
 * with dynamic per-event verification.
 */
export interface EventVerifierAgentStub {
  isRealEvent(title: string, date: string, venue: string, sourceUrl?: string): Promise<{
    isReal: boolean;
    confidence: 'high' | 'medium' | 'low';
    evidence: string;
  }>;
}

/**
 * CurationAgent
 * Applies editorial judgment to select the best events.
 * Scores for: novelty, local relevance, cultural significance, timing.
 * Sets editorPick=true on top events.
 */
export interface CurationAgentStub {
  curate(events: IRLEvent[]): Promise<IRLEvent[]>;
}

/**
 * UXAgent
 * Generates app-optimized copy: shortWhy (1 line), editorialWhy (2-5 lines).
 * Tailored to Miami/FLL audience. Replaces batchGenerateEditorial().
 * Can also generate category tags based on event content.
 */
export interface UXAgentStub {
  generateCopy(event: IRLEvent): Promise<{ shortWhy: string; editorialWhy: string }>;
}

/**
 * BrandingAgent
 * Finds or assigns images for events.
 * Sources: event's own image, venue image, Unsplash category fallback.
 * Ensures every event shown in the app has a visual.
 */
export interface BrandingAgentStub {
  assignImage(event: IRLEvent): Promise<string | null>;
}

/**
 * PMAgent (Product Management Agent)
 * Monitors scraper health: success rate, event count trends, source freshness.
 * Suggests new Instagram accounts or websites to add as sources.
 * Flags sources that have gone stale (0 events for N runs).
 */
export interface PMAgentStub {
  analyzeSourceHealth(runHistory: unknown[]): Promise<{
    staleSources: string[];
    suggestedNewSources: string[];
    healthReport: string;
  }>;
}
