import { readFileSync } from 'fs';
import { join } from 'path';
import { EventsArraySchema } from '../src/data/schema';

const dataDir = join(__dirname, '../src/data');

function validateFile(filename: string): boolean {
  console.log(`\nValidating ${filename}...`);

  try {
    const content = readFileSync(join(dataDir, filename), 'utf-8');
    const data = JSON.parse(content);

    const result = EventsArraySchema.safeParse(data);

    if (!result.success) {
      console.error('Validation errors:');
      result.error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      return false;
    }

    console.log(`  ✓ ${result.data.length} events validated`);

    // Check for duplicate IDs
    const ids = result.data.map((e) => e.id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicates.length > 0) {
      console.error(`  ✗ Duplicate IDs found: ${duplicates.join(', ')}`);
      return false;
    }

    // Check for past events
    const now = new Date();
    const pastEvents = result.data.filter((e) => new Date(e.startAt) < now);
    if (pastEvents.length > 0) {
      console.warn(`  ⚠ ${pastEvents.length} events are in the past`);
    }

    // Check for missing coordinates
    const noCoords = result.data.filter((e) => e.lat === null || e.lng === null);
    if (noCoords.length > 0) {
      console.warn(`  ⚠ ${noCoords.length} events missing coordinates`);
    }

    return true;
  } catch (err) {
    console.error(`Failed to validate ${filename}:`, err);
    return false;
  }
}

const files = ['events.miami.json', 'events.fll.json'];
let allValid = true;

for (const file of files) {
  if (!validateFile(file)) {
    allValid = false;
  }
}

console.log('\n' + (allValid ? '✓ All files valid' : '✗ Validation failed'));
process.exit(allValid ? 0 : 1);
