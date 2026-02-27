import { FortLauderdaleScraper } from './src/sources/fort-lauderdale.js';
const s = new FortLauderdaleScraper();
const events = await s.scrape();
console.log('Generated:', events.length, 'FLL template events');
if (events.length > 0) {
  console.log('Sample venues:', [...new Set(events.map(e=>e.venueName))].slice(0,10));
}
