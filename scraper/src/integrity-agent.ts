/**
 * Integrity Agent
 *
 * Two-phase pipeline gate that detects and kills template/fake events:
 *
 * Phase 1 — Static Audit: scans scraper source files for template patterns
 *   (hardcoded event arrays, date generation without HTTP fetch, rateLimit: 0)
 *
 * Phase 2 — Data Gate: reads output events.json and removes any events
 *   whose source.name matches a flagged template scraper
 *
 * Wired into the GitHub Actions pipeline to run AFTER scrape, BEFORE commit.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Types ───────────────────────────────────────────────────────────

interface AuditResult {
  file: string;
  scraperNames: string[];
  classification: 'template' | 'real' | 'hybrid';
  signals: string[];
}

interface IntegrityReport {
  timestamp: string;
  phase1: {
    totalFiles: number;
    templateFiles: number;
    realFiles: number;
    hybridFiles: number;
    templateScrapers: string[];
    realScrapers: string[];
    details: AuditResult[];
  };
  phase2: {
    totalEventsBefore: number;
    totalEventsAfter: number;
    killed: number;
    killedBySource: Record<string, number>;
    killedPercent: string;
  };
}

// ─── Phase 1: Static Source Audit ────────────────────────────────────

// Signals that indicate a template/fake scraper
const TEMPLATE_SIGNALS = {
  // Date generation imports (date-fns functions used for programmatic date creation)
  dateFnsImport: /import\s*\{[^}]*(addDays|addWeeks|nextSaturday|nextSunday|nextDay|getDay|nextMonday|nextTuesday|nextWednesday|nextThursday|nextFriday)[^}]*\}\s*from\s*['"]date-fns/,
  // Hardcoded event arrays in class body
  hardcodedArray: /private\s+\w+\s*[:=]\s*\w*\[?\s*=?\s*\[/,
  // rateLimit: 0 means no HTTP requests needed
  zeroRateLimit: /rateLimit:\s*0/,
  // Day-of-week scheduling pattern (template generators use this)
  dayOfWeekPattern: /days:\s*\[\d/,
  // Recurring event generation helpers
  recurringPattern: /dayOfWeek:|frequency:\s*['"](?:weekly|biweekly|monthly)/,
  // "Generates events" in doc comment — self-declared template
  generatesComment: /\*\s*Generates?\s+events/i,
};

// Signals that indicate a real scraper (makes HTTP requests)
const REAL_SIGNALS = {
  fetchCall: /this\.fetch\(|this\.fetchHTML|this\.fetchJSON|this\.fetchHTMLNative|this\.fetchJSONNative|this\.fetchHTMLFetch|this\.fetchJSONFetch/,
  httpUrl: /https?:\/\/[^\s'"]+/,
  rateLimit: /rateLimit:\s*[1-9]\d*/,
  cheerioUse: /cheerio\.load|\.load\(html\)/,
  graphqlQuery: /query\s*\{|mutation\s*\{|graphql/i,
  apiEndpoint: /\/api\/|\/v[12]\//,
};

function auditSourceFile(filePath: string, content: string): AuditResult {
  const fileName = filePath.split('/').pop() || filePath;

  // Extract scraper names from super() calls
  // Handle both single and double quotes, and names with apostrophes like "Don't Tell Comedy"
  const scraperNames: string[] = [];
  // Match super('...') with single quotes — capture everything up to the closing quote + comma/paren
  const singleQuoteMatches = content.matchAll(/super\(\s*'([^']+)'/g);
  for (const m of singleQuoteMatches) {
    scraperNames.push(m[1]);
  }
  // Match super("...") with double quotes
  const doubleQuoteMatches = content.matchAll(/super\(\s*"([^"]+)"/g);
  for (const m of doubleQuoteMatches) {
    if (!scraperNames.includes(m[1])) scraperNames.push(m[1]);
  }

  const templateSignals: string[] = [];
  const realSignals: string[] = [];

  // Check template signals
  for (const [name, pattern] of Object.entries(TEMPLATE_SIGNALS)) {
    if (pattern.test(content)) {
      templateSignals.push(name);
    }
  }

  // Check real signals
  for (const [name, pattern] of Object.entries(REAL_SIGNALS)) {
    if (pattern.test(content)) {
      realSignals.push(name);
    }
  }

  // Classification logic:
  // - "real" if it makes HTTP fetch calls (fetchCall signal present)
  // - "template" if it has template signals but no fetch calls
  // - "hybrid" if it has both (rare — some files have both patterns)
  const hasFetch = realSignals.includes('fetchCall');
  const hasTemplateData = templateSignals.includes('hardcodedArray') ||
    templateSignals.includes('dateFnsImport') ||
    templateSignals.includes('dayOfWeekPattern');
  const hasZeroRate = templateSignals.includes('zeroRateLimit');

  let classification: 'template' | 'real' | 'hybrid';

  if (hasFetch && !hasZeroRate) {
    classification = hasTemplateData ? 'hybrid' : 'real';
  } else if (hasTemplateData || hasZeroRate) {
    classification = 'template';
  } else if (hasFetch) {
    classification = 'real';
  } else {
    // No clear signals — classify based on rateLimit
    classification = hasZeroRate ? 'template' : 'real';
  }

  return {
    file: fileName,
    scraperNames,
    classification,
    signals: [...templateSignals.map(s => `template:${s}`), ...realSignals.map(s => `real:${s}`)],
  };
}

function runStaticAudit(): AuditResult[] {
  const sourcesDir = join(__dirname, 'sources');
  const files = readdirSync(sourcesDir).filter(f => f.endsWith('.ts') && f !== 'base.ts' && f !== 'index.ts' && f !== 'puppeteer-base.ts');

  const results: AuditResult[] = [];

  for (const file of files) {
    const filePath = join(sourcesDir, file);
    const content = readFileSync(filePath, 'utf-8');
    results.push(auditSourceFile(filePath, content));
  }

  return results;
}

// ─── Phase 2: Data Gate ──────────────────────────────────────────────

interface EventRecord {
  id: string;
  title: string;
  startAt: string;
  source?: { name: string; url: string };
  [key: string]: unknown;
}

function runDataGate(templateSourceNames: Set<string>, dataDir: string): {
  kept: EventRecord[];
  killed: EventRecord[];
  killedBySource: Record<string, number>;
} {
  const eventsPath = join(dataDir, 'events.json');
  if (!existsSync(eventsPath)) {
    console.log('  No events.json found — skipping data gate');
    return { kept: [], killed: [], killedBySource: {} };
  }

  const events: EventRecord[] = JSON.parse(readFileSync(eventsPath, 'utf-8'));
  const kept: EventRecord[] = [];
  const killed: EventRecord[] = [];
  const killedBySource: Record<string, number> = {};

  for (const event of events) {
    const sourceName = event.source?.name || 'unknown';
    if (templateSourceNames.has(sourceName)) {
      killed.push(event);
      killedBySource[sourceName] = (killedBySource[sourceName] || 0) + 1;
    } else {
      kept.push(event);
    }
  }

  return { kept, killed, killedBySource };
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const auditOnly = process.argv.includes('--audit-only');
  const gateOnly = process.argv.includes('--gate-only');

  const dataDir = join(__dirname, '../../public/data');

  console.log('');
  console.log('================================================================');
  console.log('  INTEGRITY AGENT');
  console.log('================================================================');

  // ─── Phase 1: Static Audit ───────────────────────────────────────

  let auditResults: AuditResult[] = [];
  let templateSourceNames = new Set<string>();

  if (!gateOnly) {
    console.log('\n  Phase 1: Static Source Audit');
    console.log('  ─────────────────────────────');

    auditResults = runStaticAudit();

    const templates = auditResults.filter(r => r.classification === 'template');
    const reals = auditResults.filter(r => r.classification === 'real');
    const hybrids = auditResults.filter(r => r.classification === 'hybrid');

    // Collect source names from real/hybrid scrapers (these are safe)
    const realSourceNames = new Set<string>();
    for (const r of [...reals, ...hybrids]) {
      for (const name of r.scraperNames) {
        realSourceNames.add(name);
      }
    }

    // Collect source names from template scrapers, but EXCLUDE any name
    // that also appears in a real/hybrid scraper. This prevents killing
    // real events when a source name is shared (e.g., "Resident Advisor"
    // exists in both nightlife-clubs.ts (template) and resident-advisor.ts (real)).
    for (const t of templates) {
      for (const name of t.scraperNames) {
        if (!realSourceNames.has(name)) {
          templateSourceNames.add(name);
        }
      }
    }

    console.log(`\n  Template scrapers: ${templates.length} files`);
    for (const t of templates) {
      const names = t.scraperNames.length > 0 ? ` (${t.scraperNames.join(', ')})` : '';
      console.log(`    TEMPLATE  ${t.file}${names}`);
    }

    console.log(`\n  Real scrapers: ${reals.length} files`);
    for (const r of reals) {
      const names = r.scraperNames.length > 0 ? ` (${r.scraperNames.join(', ')})` : '';
      console.log(`    REAL      ${r.file}${names}`);
    }

    if (hybrids.length > 0) {
      console.log(`\n  Hybrid scrapers: ${hybrids.length} files`);
      for (const h of hybrids) {
        const names = h.scraperNames.length > 0 ? ` (${h.scraperNames.join(', ')})` : '';
        console.log(`    HYBRID    ${h.file}${names}`);
      }
    }

    console.log(`\n  Template source names to gate: ${[...templateSourceNames].join(', ')}`);
  }

  if (auditOnly) {
    console.log('\n  --audit-only: skipping data gate');
    console.log('================================================================\n');
    return;
  }

  // ─── Phase 2: Data Gate ──────────────────────────────────────────

  console.log('\n  Phase 2: Data Gate');
  console.log('  ─────────────────────────────');

  // If gate-only, we need to reconstruct templateSourceNames from a fresh audit
  if (gateOnly) {
    auditResults = runStaticAudit();
    const realNames = new Set<string>();
    for (const r of auditResults.filter(r => r.classification === 'real' || r.classification === 'hybrid')) {
      for (const name of r.scraperNames) realNames.add(name);
    }
    for (const t of auditResults.filter(r => r.classification === 'template')) {
      for (const name of t.scraperNames) {
        if (!realNames.has(name)) templateSourceNames.add(name);
      }
    }
  }

  const { kept, killed, killedBySource } = runDataGate(templateSourceNames, dataDir);
  const totalBefore = kept.length + killed.length;

  console.log(`\n  Events before gate: ${totalBefore}`);
  console.log(`  Events killed:      ${killed.length}`);
  console.log(`  Events kept:        ${kept.length}`);

  if (totalBefore > 0) {
    console.log(`  Kill rate:          ${((killed.length / totalBefore) * 100).toFixed(1)}%`);
  }

  if (Object.keys(killedBySource).length > 0) {
    console.log('\n  Killed by source:');
    const sorted = Object.entries(killedBySource).sort(([, a], [, b]) => b - a);
    for (const [source, count] of sorted) {
      console.log(`    ${source}: ${count} events`);
    }
  }

  // Write cleaned events back (unless dry run)
  if (!isDryRun && killed.length > 0) {
    // Write combined events
    const eventsPath = join(dataDir, 'events.json');
    writeFileSync(eventsPath, JSON.stringify(kept, null, 2));
    console.log(`\n  Wrote ${kept.length} clean events to events.json`);

    // Also update city-specific files
    const miamiEvents = kept.filter((e: any) => e.city === 'Miami');
    const fllEvents = kept.filter((e: any) => e.city === 'Fort Lauderdale');
    const pbEvents = kept.filter((e: any) => e.city === 'Palm Beach');

    writeFileSync(join(dataDir, 'events.miami.json'), JSON.stringify(miamiEvents, null, 2));
    writeFileSync(join(dataDir, 'events.fll.json'), JSON.stringify(fllEvents, null, 2));
    writeFileSync(join(dataDir, 'events.pb.json'), JSON.stringify(pbEvents, null, 2));

    console.log(`  Wrote ${miamiEvents.length} Miami, ${fllEvents.length} FLL, ${pbEvents.length} PB events`);
  } else if (isDryRun) {
    console.log('\n  --dry-run: no files modified');
  } else {
    console.log('\n  No template events found — data is clean');
  }

  // ─── Write Integrity Report ──────────────────────────────────────

  const templates = auditResults.filter(r => r.classification === 'template');
  const reals = auditResults.filter(r => r.classification === 'real');
  const hybrids = auditResults.filter(r => r.classification === 'hybrid');

  const report: IntegrityReport = {
    timestamp: new Date().toISOString(),
    phase1: {
      totalFiles: auditResults.length,
      templateFiles: templates.length,
      realFiles: reals.length,
      hybridFiles: hybrids.length,
      templateScrapers: [...templateSourceNames],
      realScrapers: reals.flatMap(r => r.scraperNames),
      details: auditResults,
    },
    phase2: {
      totalEventsBefore: totalBefore,
      totalEventsAfter: kept.length,
      killed: killed.length,
      killedBySource,
      killedPercent: totalBefore > 0 ? ((killed.length / totalBefore) * 100).toFixed(1) + '%' : '0%',
    },
  };

  if (!isDryRun) {
    const reportPath = join(dataDir, 'integrity-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n  Integrity report saved to integrity-report.json`);
  }

  console.log('\n================================================================');

  // Exit with error if template events were killed (signals pipeline issue)
  if (killed.length > 0 && !isDryRun) {
    console.log(`  ${killed.length} template events killed. Pipeline data is now clean.`);
    console.log('================================================================\n');
    // Exit 0 — the agent successfully cleaned the data.
    // The scraper pipeline should continue (commit clean data).
  }
}

main().catch((err) => {
  console.error('Integrity agent failed:', err);
  process.exitCode = 1;
});
