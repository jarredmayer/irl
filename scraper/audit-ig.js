const events = require('./src/data/events.json');
const igEvents = events.filter(e => e.source && e.source.name && e.source.name.startsWith('@'));
const bySource = {};
igEvents.forEach(e => {
  const k = e.source.name;
  if (!bySource[k]) bySource[k] = [];
  bySource[k].push(e);
});
Object.keys(bySource).sort().forEach(src => {
  const evs = bySource[src];
  const e = evs[0];
  const venue = (e.venueName || '').substring(0, 35);
  const title = e.title.substring(0, 50);
  console.log(src + ' (' + evs.length + 'x): ' + title + ' @ ' + venue + ' | ' + e.neighborhood);
});
