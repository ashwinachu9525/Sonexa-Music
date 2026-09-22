import { musicOrchestrator } from '../src/lib/orchestrator/orchestrator';

async function runTests() {
  console.log('--- Starting Orchestrator Integration Tests ---\n');

  // Test 1: Deduplication key generation
  const key1 = musicOrchestrator.generateSongKey('Kesariya (From "Brahmastra")', 'Arijit Singh');
  const key2 = musicOrchestrator.generateSongKey('kesariya', 'arijit singh');
  console.log('Test 1 (Key Normalization):', { key1, key2, match: key1.includes('kesariya') });

  // Test 2: Search with source = all
  console.log('\nTest 2: Searching with source=all (query: "arijit")...');
  try {
    const searchResult = await musicOrchestrator.search({ q: 'arijit', source: 'all', limit: 5 });
    console.log('Search success!');
    console.log('Query:', searchResult.query);
    console.log('Total items returned:', searchResult.items.length);
    console.log('Providers status:', searchResult.providers);

    if (searchResult.items.length > 0) {
      const first = searchResult.items[0];
      console.log('First item sample:', {
        id: first.id,
        source: first.source,
        title: first.title,
        artist: first.artist.name,
        audioUrl: first.audio.url,
      });

      // Test 3: Get Details
      console.log(`\nTest 3: Fetching song details for ${first.source}:${first.id}...`);
      const details = await musicOrchestrator.getSong(first.source, first.id);
      console.log('Details fetched:', details ? details.title : 'null');

      // Test 4: Get Lyrics
      console.log(`\nTest 4: Fetching lyrics for ${first.source}:${first.id}...`);
      const lyrics = await musicOrchestrator.getLyrics(first.source, first.id);
      console.log('Lyrics fetched:', lyrics);

      // Test 5: Get Stream
      console.log(`\nTest 5: Fetching stream URL for ${first.source}:${first.id}...`);
      const stream = await musicOrchestrator.getStream(first.source, first.id);
      console.log('Stream info:', stream);
    }
  } catch (err) {
    console.error('Test failed with error:', err);
  }

  console.log('\n--- All Orchestrator Tests Completed ---');
  process.exit(0);
}

runTests();
