require('dotenv').config();

async function testLrclibResolver() {
  console.log('--- Testing LRCLib Fallback Lyrics Resolver ---');

  const testCases = [
    { title: 'Kesariya', artist: 'Arijit Singh', duration: 268 },
    { title: 'Tum Hi Ho', artist: 'Arijit Singh', duration: 262 },
    { title: 'Channa Mereya', artist: 'Arijit Singh', duration: 289 }
  ];

  for (const tc of testCases) {
    console.log(`\nQuerying LRCLib for: "${tc.title}" by "${tc.artist}"...`);
    try {
      const getUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(tc.artist)}&track_name=${encodeURIComponent(tc.title)}`;
      const getRes = await fetch(getUrl, {
        headers: { 'User-Agent': 'SonexaMusic/1.0' }
      });

      if (getRes.ok) {
        const item = await getRes.json();
        console.log(`  ✓ Exact GET match found! Synced: ${Boolean(item.syncedLyrics)}, Plain: ${Boolean(item.plainLyrics)}`);
        const sample = (item.syncedLyrics || item.plainLyrics || '').slice(0, 120);
        console.log(`  Snippet: ${sample.replace(/\n/g, ' ')}...`);
        continue;
      }

      // If GET fails, try SEARCH
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${tc.title} ${tc.artist}`)}`;
      const searchRes = await fetch(searchUrl, {
        headers: { 'User-Agent': 'SonexaMusic/1.0' }
      });

      if (searchRes.ok) {
        const results = await searchRes.json();
        console.log(`  ✓ Search returned ${results.length} candidates.`);
        if (results.length > 0) {
          const match = results.find(r => r.syncedLyrics || r.plainLyrics);
          if (match) {
            console.log(`  Selected Candidate: "${match.trackName}" by "${match.artistName}"`);
            const sample = (match.syncedLyrics || match.plainLyrics || '').slice(0, 120);
            console.log(`  Snippet: ${sample.replace(/\n/g, ' ')}...`);
          }
        }
      }
    } catch (err) {
      console.error(`  x Error querying LRCLib:`, err.message);
    }
  }

  console.log('\n--- LRCLib Resolver Tests Complete ---');
}

testLrclibResolver();
