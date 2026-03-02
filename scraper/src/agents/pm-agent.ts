/**
 * PMAgent — Product Manager Agent
 *
 * Runs weekly (not per-scrape). Reads scrape-meta.json and produces a health report:
 *  - Stale scrapers (empty output for 2+ consecutive runs)
 *  - Errored scrapers (fetch/parse failures)
 *  - Trend analysis: gradual decline vs. cliff-drop (via rolling 5-run history)
 *  - Suggested new Instagram accounts to monitor
 *  - Summary health report string for logging/alerting
 *
 * No LLM calls — pure data analysis.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

const META_PATH = join(__dir, '../../../public/data/scrape-meta.json');
const HISTORY_PATH = join(__dir, '../../cache/scrape-history.json');
const IG_SOURCES_PATH = join(__dir, '../sources/instagram-sources.ts');

const HISTORY_MAX_RUNS = 5;

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

interface HistoryEntry {
  scrapedAt: string;
  sources: Array<{ name: string; count: number; status: 'ok' | 'empty' | 'error' }>;
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

/** Load rolling history from disk */
function loadHistory(): HistoryEntry[] {
  try {
    if (!existsSync(HISTORY_PATH)) return [];
    return JSON.parse(readFileSync(HISTORY_PATH, 'utf-8')) as HistoryEntry[];
  } catch {
    return [];
  }
}

/** Append current scrape to history, keep only last HISTORY_MAX_RUNS entries */
function appendHistory(meta: ScrapeMeta): HistoryEntry[] {
  const history = loadHistory();
  const entry: HistoryEntry = {
    scrapedAt: meta.scrapedAt,
    sources: (meta.sources ?? []).map((s) => ({ name: s.name, count: s.count, status: s.status })),
  };
  // Avoid duplicate entries for the same scrape timestamp
  if (!history.some((h) => h.scrapedAt === entry.scrapedAt)) {
    history.push(entry);
  }
  const trimmed = history.slice(-HISTORY_MAX_RUNS);
  try {
    writeFileSync(HISTORY_PATH, JSON.stringify(trimmed, null, 2));
  } catch {
    // Non-fatal
  }
  return trimmed;
}

interface TrendAnalysis {
  /** Sources with steady count decline over 3+ runs */
  graduallyDeclining: Array<{ name: string; trend: string }>;
  /** Sources that were OK last run but cliffed to error/empty now */
  suddenlyFailed: string[];
}

/**
 * Analyze rolling history to distinguish gradual decline from cliff-drops.
 * graduallyDeclining: count dropped >50% over last 3+ runs
 * suddenlyFailed: was 'ok' in previous run, now 'error' or 'empty'
 */
function analyzeTrends(history: HistoryEntry[], currentMeta: ScrapeMeta): TrendAnalysis {
  const graduallyDeclining: Array<{ name: string; trend: string }> = [];
  const suddenlyFailed: string[] = [];

  if (history.length < 2) return { graduallyDeclining, suddenlyFailed };

  const prevRun = history[history.length - 2]; // second-to-last
  const currentSourceMap = new Map(
    (currentMeta.sources ?? []).map((s) => [s.name, s])
  );

  // Cliff-drop detection: was ok in prev run, now error/empty
  for (const prevSource of prevRun.sources) {
    if (prevSource.status !== 'ok') continue;
    const current = currentSourceMap.get(prevSource.name);
    if (current && current.status !== 'ok') {
      suddenlyFailed.push(prevSource.name);
    }
  }

  // Gradual decline: look at all runs for each source
  const allSourceNames = new Set(
    history.flatMap((h) => h.sources.map((s) => s.name))
  );

  for (const sourceName of allSourceNames) {
    const counts = history
      .map((h) => h.sources.find((s) => s.name === sourceName)?.count ?? null)
      .filter((c): c is number => c !== null);

    if (counts.length < 3) continue;

    const maxCount = Math.max(...counts);
    const latest = counts[counts.length - 1];
    const isDecreasing = counts.slice(-3).every((c, i, arr) => i === 0 || c <= arr[i - 1]);

    if (isDecreasing && maxCount > 0 && latest < maxCount * 0.5) {
      const trend = counts.map(String).join(' → ');
      graduallyDeclining.push({ name: sourceName, trend });
    }
  }

  return { graduallyDeclining, suddenlyFailed };
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

    // Update rolling history and analyze trends
    const history = appendHistory(meta);
    const trends = analyzeTrends(history, meta);

    const { sourceHealth } = meta;
    const staleSources = [...(sourceHealth.emptySources ?? []), ...(sourceHealth.erroredSources ?? [])];
    const totalSources = sourceHealth.ok + sourceHealth.empty + sourceHealth.errored;
    const healthPct = totalSources > 0 ? Math.round((sourceHealth.ok / totalSources) * 100) : 0;

    const scrapedAt = new Date(meta.scrapedAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const lines: string[] = [
      `📊 PMAgent Source Health Report — ${scrapedAt}`,
      `   ${sourceHealth.ok}/${totalSources} sources healthy (${healthPct}%) | History: ${history.length} runs`,
      '',
    ];

    if (sourceHealth.erroredSources.length > 0) {
      lines.push(`🔴 Errored (${sourceHealth.erroredSources.length}): ${sourceHealth.erroredSources.join(', ')}`);
    }
    if (sourceHealth.emptySources.length > 0) {
      lines.push(`🟡 Empty (${sourceHealth.emptySources.length}): ${sourceHealth.emptySources.join(', ')}`);
    }

    // Trend-based alerts (only if we have enough history)
    if (trends.suddenlyFailed.length > 0) {
      lines.push(`🆕 Sudden failures (was OK last run): ${trends.suddenlyFailed.join(', ')}`);
      lines.push(`   → Likely cause: scraper broke or site changed. Investigate first.`);
    }
    if (trends.graduallyDeclining.length > 0) {
      lines.push(`📉 Gradual decline (>50% drop over 3+ runs):`);
      for (const { name, trend } of trends.graduallyDeclining) {
        lines.push(`   ${name}: ${trend}`);
      }
      lines.push(`   → Consider refreshing scraper logic or dropping source.`);
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
