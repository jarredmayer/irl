/**
 * Instagram Post Scraper — standalone script
 *
 * Fetches real Instagram posts for all monitored accounts, uses Claude to extract
 * event data from captions and flyer images, and saves to instagram-posts-cache.json.
 *
 * Run: npx tsx scrape-instagram-posts.mjs
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY    — Claude API key (already used by the aggregator)
 *   INSTAGRAM_SESSION_ID — sessionid cookie from a logged-in Instagram browser session
 *                          (Settings → Copy from browser devtools → Application → Cookies)
 *
 * Output: src/data/instagram-posts-cache.json
 * The merge scripts automatically pick up this cache file on the next run.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../src/data');
const cacheFile = join(dataDir, 'instagram-posts-cache.json');

// All monitored Instagram accounts with city and location hints
// Ordered: media/aggregator accounts first (most likely to have upcoming event posts)
const ACCOUNTS = [
  // Media / event guide accounts
  { handle: 'themiamiguide',       city: 'Miami',            locationHint: 'Miami metro area' },
  { handle: 'miamibucketlist',     city: 'Miami',            locationHint: 'Miami metro area' },
  { handle: 'timeoutmiami',        city: 'Miami',            locationHint: 'Miami metro area' },
  { handle: 'miaminewtimes',       city: 'Miami',            locationHint: 'Miami metro area' },
  { handle: 'miamitimes',          city: 'Miami',            locationHint: 'Miami metro area' },
  { handle: 'lauderale',           city: 'Fort Lauderdale',  locationHint: 'Fort Lauderdale, Las Olas area' },

  // Venue / community accounts
  { handle: 'wynwoodmiami',        city: 'Miami',            locationHint: 'Wynwood arts district, Miami' },
  { handle: 'rawfigspopup',        city: 'Miami',            locationHint: 'Wynwood / Miami pop-up scene' },
  { handle: 'wynwood_marketplace', city: 'Miami',            locationHint: 'Wynwood Marketplace, 2250 NW 2nd Ave' },
  { handle: 'coffeeandbeatsofficial', city: 'Miami',         locationHint: 'Miami / Wynwood area' },
  { handle: 'miamibloco',          city: 'Miami',            locationHint: 'Miami streets / Wynwood' },
  { handle: 'discodomingomiami',   city: 'Miami',            locationHint: 'South Beach / Miami nightlife' },
  { handle: 'thestandardmiami',    city: 'Miami',            locationHint: '40 Island Ave, Miami Beach' },
  { handle: 'standardmiamibch',    city: 'Miami',            locationHint: '40 Island Ave, Miami Beach' },
  { handle: 'miamiconcours',       city: 'Miami',            locationHint: 'Coral Gables, The Biltmore' },
  { handle: 'miamijazzbooking',    city: 'Miami',            locationHint: 'Various Miami venues' },
  { handle: 'coffeeandchillmiami', city: 'Miami',            locationHint: 'Miami / Brickell / Wynwood' },
  { handle: 'thirdspacesmiami',    city: 'Miami',            locationHint: 'Downtown Miami' },
  { handle: 'soyaepomodoro',       city: 'Miami',            locationHint: '120 NE 1st St, Downtown Miami' },
  { handle: 'gramps_miami',        city: 'Miami',            locationHint: '176 NW 24th St, Wynwood' },
  { handle: 'lasrosasmiami',       city: 'Miami',            locationHint: '2898 NW 7th Ave, Miami' },
  { handle: 'lagniappe_miami',     city: 'Miami',            locationHint: '3425 NE 2nd Ave, Miami' },
  { handle: 'thewharfmiami',       city: 'Miami',            locationHint: '114 SW North River Dr, Miami' },
  { handle: 'pamm_museum',         city: 'Miami',            locationHint: '1103 Biscayne Blvd, Museum Park' },
  { handle: 'northbeachbandshell', city: 'Miami',            locationHint: '7275 Collins Ave, Miami Beach' },
  { handle: 'wynwoodwalls',        city: 'Miami',            locationHint: '2520 NW 2nd Ave, Wynwood' },
  { handle: 'criticalmassmiami',   city: 'Miami',            locationHint: 'Miami streets, monthly bike ride' },
  { handle: 'themiamiflea',        city: 'Miami',            locationHint: 'Miami Flea Market' },
  { handle: 'miamirunclub',        city: 'Miami',            locationHint: 'Bayfront Park, Miami' },
  { handle: 'wynaborhood',         city: 'Miami',            locationHint: 'Wynwood neighborhood' },
  { handle: 'baborhood',           city: 'Miami',            locationHint: 'Brickell neighborhood' },
  { handle: 'mikiaminightlife',    city: 'Miami',            locationHint: 'Miami nightlife' },
  { handle: 'churchillspub',       city: 'Miami',            locationHint: '5501 NE 2nd Ave, Little Haiti' },
  { handle: 'fortlauderdaledowntown', city: 'Fort Lauderdale', locationHint: 'Downtown Fort Lauderdale' },
  { handle: 'wiltonmanorsfl',      city: 'Fort Lauderdale',  locationHint: 'Wilton Drive, Wilton Manors' },
  { handle: 'thefernbarftl',       city: 'Fort Lauderdale',  locationHint: '700 N Andrews Ave, Fort Lauderdale' },
  { handle: 'sunnysideupmarket',   city: 'Fort Lauderdale',  locationHint: 'Fort Lauderdale market scene' },
  { handle: 'lauderdalerunclub',   city: 'Fort Lauderdale',  locationHint: 'Fort Lauderdale running routes' },
  { handle: 'wynwood_yoga',        city: 'Miami',            locationHint: 'Wynwood Walls Garden, 2520 NW 2nd Ave' },
  { handle: 'coffeeandchillmiami', city: 'Miami',            locationHint: 'Miami community spaces' },
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set');
    process.exit(1);
  }
  if (!process.env.INSTAGRAM_SESSION_ID) {
    console.warn('⚠️  INSTAGRAM_SESSION_ID not set — Instagram may block unauthenticated requests');
    console.warn('   Get it: Instagram → browser devtools → Application → Cookies → sessionid');
  }

  const { scrapeIGAccount } = await import('./src/sources/instagram-post-scraper.js');

  const allEvents = [];
  const errors = [];
  const skipped = [];

  // Deduplicate handles (some appear twice in list)
  const seen = new Set();
  const accounts = ACCOUNTS.filter(a => {
    if (seen.has(a.handle)) return false;
    seen.add(a.handle);
    return true;
  });

  console.log(`\n📸 Scraping ${accounts.length} Instagram accounts for event posts...\n`);

  for (const account of accounts) {
    process.stdout.write(`  @${account.handle}... `);
    try {
      const events = await scrapeIGAccount(account);
      if (events.length > 0) {
        allEvents.push(...events);
        console.log(`✅ ${events.length} event(s)`);
      } else {
        console.log('(none found)');
        skipped.push(account.handle);
      }
    } catch (err) {
      const msg = err?.message ?? String(err);
      console.log(`❌ ${msg}`);
      errors.push({ handle: account.handle, error: msg });
    }
    // Be respectful — 2s between accounts
    await sleep(2000);
  }

  // Save cache
  const cache = {
    generatedAt: new Date().toISOString(),
    accountsScraped: accounts.length - errors.length,
    accountsFailed: errors.length,
    events: allEvents,
    errors,
  };

  writeFileSync(cacheFile, JSON.stringify(cache, null, 2));

  console.log(`\n✅ Saved ${allEvents.length} events from ${accounts.length - errors.length} accounts`);
  if (errors.length) console.log(`⚠️  ${errors.length} accounts failed:`, errors.map(e => e.handle).join(', '));
  console.log(`📁 Cache: ${cacheFile}`);
  console.log('\nRun merge-fll.mjs or merge-miami-venues.mjs to incorporate into event feeds.\n');
}

main().catch(console.error);
