import { getDatabase } from '../src/services/database';

async function clearRoads() {
  const db = getDatabase();
  const result = await db.road.deleteMany({});
  console.log('Deleted', result.count, 'roads from database');
  process.exit(0);
}

clearRoads().catch(console.error);
