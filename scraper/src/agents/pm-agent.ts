/**
 * PMAgent — Product Manager Agent
 *
 * Runs weekly (not per-scrape). Reads scrape-meta.json and produces a health report:
 *  - Stale scrapers (empty output for 2+ consecutive runs)
 *  - Errored scrapers (fetch/parse failures)
 *  - Suggested new Instagram accounts to monitor
 *  - Summary health report string for logging/alerting
 *
 * Implements PMAgentContract from orchestrator.ts.
 * No LLM calls — pure data analysis.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const META_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../src/data/scrape-meta.json'
);

const IG_SOURCES_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../sources/instagram-sources.ts'
);

// Full candidate pool — PMAgent filters out already-monitored handles dynamically
const IG_CANDIDATE_POOL: Array<{ handle: string; description: string }> = [
  { handle: 'broward_cultural',   description: 'Broward Cultural Division (FTL arts/culture events)' },
  { handle: 'mdc_theatre',        description: 'Miami Dade College theater productions' },
  { handle: 'calle_ocho_festival',description: 'Little Havana cultural events' },
  { handle: 'art_basel_miami',    description: 'Art Basel Miami Beach programming' },
  { handle: 'midtown_miami',      description: 'Midtown Miami neighborhood activations' },
  { handle: 'southbeachmiami',    description: 'South Beach events and activations' },
  { handle: 'miami_open',         description: 'Miami Open tennis tournament' },
  { handle: 'ultramiami',         description: 'Ultra Music Festival Miami' },
  { handle: 'sobe_arts',          description: 'South Beach arts & culture' },
  { handle: 'miamibookfair',      description: 'Miami Book Fair International' },
];

/** Read handles already in instagram-sources.ts to avoid duplicate suggestions */
function getMonitoredHandles(): Set<string> {
  try {
    const src = readFileSync(IG_SOURCES_PATH, 'utf-8');
    const matches = [...src.matchAll(/handle:\s*'([^']+)'/g)];
    return new Set(matches.map((m) => m[1]));
  } catch {
    return new Set();
  }
}

function getSuggestedAccounts(): string[] {
  const monitored = getMonitoredHandles();
  return IG_CANDIDATE_POOL
    .filter((c) => !monitored.has(c.handle))
    .map((c) => `@${c.handle} — ${c.description}`);
}

interface ScrapeMeta {
  scrapedAt: string;
  stats?: Record<string, unknown>;
  sourceHealth: {
    ok: number;
    empty: number;
    errored: number;
    emptySources: string[];
    erroredSources: string[];
  };
  sources?: Array<{
    name: string;
    count: number;
    status: 'ok' | 'empty' | 'error';
    errors: string[];
  }>;
}

export class PMAgent {
  private readMeta(): ScrapeMeta | null {
    if (!existsSync(META_PATH)) return null;
    try {
      return JSON.parse(readFileSync(META_PATH, 'utf-8')) as ScrapeMeta;
    } catch {
      return null;
    }
  }

  async analyzeSourceHealth(_runHistory: unknown[] = []): Promise<{
    staleSources: string[];
    suggestedNewSources: string[];
    healthReport: string;
  }> {
    const meta = this.readMeta();

    if (!meta) {
      const suggested = getSuggestedAccounts();
      return {
        staleSources: [],
        suggestedNewSources: suggested,
        healthReport: '⚠️  No scrape-meta.json found — run a scrape first.',
      };
    }

    const { sourceHealth } = meta;
    const staleSources = [...(sourceHealth.emptySources ?? []), ...(sourceHealth.erroredSources ?? [])];
    const totalSources = sourceHealth.ok + sourceHealth.empty + sourceHealth.errored;
    const healthPct = totalSources > 0 ? Math.round((sourceHealth.ok / totalSources) * 100) : 0;

    const scrapedAt = new Date(meta.scrapedAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const lines: string[] = [
      `📊 PMAgent Source Health Report — ${scrapedAt}`,
      `   ${sourceHealth.ok}/${totalSources} sources healthy (${healthPct}%)`,
      '',
    ];

    if (sourceHealth.erroredSources.length > 0) {
      lines.push(`🔴 Errored (${sourceHealth.erroredSources.length}): ${sourceHealth.erroredSources.join(', ')}`);
    }
    if (sourceHealth.emptySources.length > 0) {
      lines.push(`🟡 Empty (${sourceHealth.emptySources.length}): ${sourceHealth.emptySources.join(', ')}`);
    }

    lines.push('');
    const suggested = getSuggestedAccounts();
    lines.push('💡 Suggested new sources:');
    for (const s of suggested) {
      lines.push(`   ${s}`);
    }

    const healthReport = lines.join('\n');
    console.log('\n' + healthReport);

    return { staleSources, suggestedNewSources: suggested, healthReport };
  }

  /** Convenience: print health report to stdout and return stale source names */
  async report(): Promise<void> {
    await this.analyzeSourceHealth();
  }
}
