// Using built-in fetch (Node.js 18+)

async function debugSubmission() {
  const submissionId = 'sub_1758747302051_fk7desufe';
  
  console.log('🔍 Debugging submission:', submissionId);
  
  try {
    // Check submission status
    console.log('\n📊 Checking submission status...');
    const statusResponse = await fetch(`https://podcast-gen-api.azurewebsites.net/api/content/${submissionId}/status`);
    const statusResult = await statusResponse.json();
    
    console.log('Status:', statusResult.status);
    console.log('Message:', statusResult.message);
    console.log('Progress:', statusResult.progress);
    console.log('Created:', statusResult.created_at);
    console.log('Updated:', statusResult.updated_at);
    
    // Check RSS feed
    console.log('\n📡 Checking RSS feed...');
    const rssResponse = await fetch('https://podcast-gen-api.azurewebsites.net/api/feeds/public/rss.xml');
    const rssContent = await rssResponse.text();
    
    console.log('RSS Status:', rssResponse.status);
    console.log('RSS Content Length:', rssContent.length);
    
    // Look for episodes
    const episodeMatches = rssContent.match(/<item>/g);
    console.log('Episodes found:', episodeMatches ? episodeMatches.length : 0);
    
    // Look for audio URLs
    const audioUrlMatches = rssContent.match(/<enclosure[^>]*url="([^"]*)"[^>]*>/g);
    console.log('Audio URLs found:', audioUrlMatches ? audioUrlMatches.length : 0);
    
    if (audioUrlMatches) {
      audioUrlMatches.forEach((match, index) => {
        const urlMatch = match.match(/url="([^"]*)"/);
        if (urlMatch) {
          console.log(`  ${index + 1}. ${urlMatch[1]}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugSubmission();
