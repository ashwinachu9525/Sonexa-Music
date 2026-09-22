require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL?.split('?')[0];
const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runTest() {
  console.log('--- Testing Orchestrator DB & JioSaavn Integration ---');

  // Test 1: Query Local DB
  console.log('\n1. Testing Local DB Query...');
  try {
    const localSongs = await prisma.song.findMany({
      take: 5,
      include: { artist: true, album: true }
    });
    console.log(`Local songs in DB: ${localSongs.length}`);
    if (localSongs.length > 0) {
      console.log('Sample local song:', {
        id: localSongs[0].id,
        title: localSongs[0].title,
        artist: localSongs[0].artist?.name
      });
    }
  } catch (err) {
    console.error('Local DB query error:', err.message);
  }

  // Test 2: Fetch JioSaavn
  console.log('\n2. Testing JioSaavn API Query...');
  try {
    const res = await fetch('https://jio-saven-production.up.railway.app/api/search/songs?query=arijit');
    const json = await res.json();
    console.log('JioSaavn success:', json.success);
    console.log('Results count:', json.data?.results?.length);
    if (json.data?.results?.length > 0) {
      const first = json.data.results[0];
      console.log('Sample JioSaavn song:', {
        id: first.id,
        title: first.title || first.name,
        image: first.image?.[first.image?.length - 1]?.url,
        audioUrl: first.downloadUrl?.[first.downloadUrl?.length - 1]?.url
      });
    }
  } catch (err) {
    console.error('JioSaavn query error:', err.message);
  }

  console.log('\n--- Direct Tests Complete ---');
  await pool.end();
}

runTest();
