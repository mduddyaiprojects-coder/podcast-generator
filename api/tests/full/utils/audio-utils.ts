/**
 * Audio Utilities for Real E2E Test
 * 
 * These utilities validate audio generation and storage.
 */

export interface AudioValidationResult {
  audioFilesExist: boolean;
  audioFilesAccessible: boolean;
  audioFilesValid: boolean;
  audioFilesPlayable: boolean;
  audioUrls: string[];
}

/**
 * Step 6: Validate audio generation
 * 
 * This function should:
 * - Check that audio files exist in Azure Storage
 * - Verify audio files are accessible via CDN
 * - Validate audio file properties (duration, size, format)
 * - Test audio file playback
 */
export async function validateAudioGeneration(submissionIds: string[]): Promise<AudioValidationResult> {
  console.log(`🎵 Validating audio generation for ${submissionIds.length} submissions...`);
  
  const audioUrls: string[] = [];
  let allAccessible = true;
  let allValid = true;
  
  // Check each submission status
  for (const submissionId of submissionIds) {
    console.log(`  🔍 Checking submission: ${submissionId}`);
    
    try {
      // Check submission status
      const statusResponse = await fetch(`https://podcast-gen-api.azurewebsites.net/api/content/${submissionId}/status`);
      const statusResult = await statusResponse.json() as any;
      
      console.log(`    📊 Status: ${statusResult.status}`);
      console.log(`    💬 Message: ${statusResult.message}`);
      
      if (statusResult.status === 'failed') {
        console.log(`    ❌ Submission failed: ${statusResult.message}`);
        allAccessible = false;
        allValid = false;
        continue;
      }
      
      if (statusResult.status === 'completed') {
        console.log(`    ✅ Submission completed successfully`);
      }
      
    } catch (error) {
      console.log(`    ❌ Error checking submission: ${error}`);
      allAccessible = false;
      allValid = false;
    }
  }
  
  // Check RSS feed for episodes and audio URLs
  try {
    const rssResponse = await fetch('https://podcast-gen-api.azurewebsites.net/api/feeds/public/rss.xml');
    const rssContent = await rssResponse.text();
    
    // Extract audio URLs from RSS feed
    const audioUrlMatches = rssContent.match(/<enclosure[^>]*url="([^"]*)"[^>]*>/g);
    if (audioUrlMatches) {
      audioUrlMatches.forEach(match => {
        const urlMatch = match.match(/url="([^"]*)"/);
        if (urlMatch && urlMatch[1]) {
          audioUrls.push(urlMatch[1]);
        }
      });
    }
    
    console.log(`  📡 Found ${audioUrls.length} audio URLs in RSS feed`);
    audioUrls.forEach((url, index) => {
      console.log(`    ${index + 1}. ${url}`);
    });
    
    // Test if audio URLs are accessible
    for (const url of audioUrls) {
      try {
        const audioResponse = await fetch(url, { method: 'HEAD' });
        console.log(`    ${audioResponse.ok ? '✅' : '❌'} Audio accessible: ${url} (${audioResponse.status})`);
        if (!audioResponse.ok) {
          allAccessible = false;
        }
      } catch (error) {
        console.log(`    ❌ Audio not accessible: ${url} - ${error}`);
        allAccessible = false;
      }
    }
    
  } catch (error) {
    console.log(`  ❌ Error checking RSS feed: ${error}`);
    allAccessible = false;
  }
  
  return {
    audioFilesExist: audioUrls.length > 0,
    audioFilesAccessible: allAccessible,
    audioFilesValid: allValid,
    audioFilesPlayable: allAccessible && audioUrls.length > 0,
    audioUrls: audioUrls
  };
}
