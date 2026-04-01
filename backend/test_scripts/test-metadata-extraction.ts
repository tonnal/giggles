import { extractPhotoMetadata } from '../lib/services/metadata-extractor';
import fs from 'fs';

async function testMetadataExtraction() {
  console.log('📸 Testing metadata extraction...\n');

  const imagePath = '/Users/aryanjain/Desktop/Giggles/backend/assets/test_photo/avyaan1.jpeg';

  try {
    // Read the image file
    const buffer = fs.readFileSync(imagePath);
    console.log(`✅ Image loaded: ${buffer.length} bytes\n`);

    // Extract metadata
    const metadata = await extractPhotoMetadata(buffer, 'avyaan1.jpeg');

    console.log('📋 Extracted Metadata:\n');
    console.log(JSON.stringify(metadata, null, 2));
    console.log('\n---\n');

    // Show specific details
    console.log('🎯 Key Information:');
    console.log(`📐 Dimensions: ${metadata.width}x${metadata.height}`);
    console.log(`📅 Date Taken: ${metadata.dateTaken || 'Not available'}`);
    console.log(`📍 Location: ${metadata.location ?
      `${metadata.location.latitude}, ${metadata.location.longitude}` :
      'No GPS data'}`);
    console.log(`📱 Camera: ${metadata.camera?.make || 'Unknown'} ${metadata.camera?.model || ''}`);
    console.log(`🌅 Time of Day: ${metadata.detectedContext?.timeOfDay || 'Unknown'}`);
    console.log(`🍂 Season: ${metadata.detectedContext?.season || 'Unknown'}`);
    console.log(`🏠 Indoor: ${metadata.detectedContext?.isIndoor ? 'Yes' : 'No'}`);
    console.log(`🤳 Selfie: ${metadata.detectedContext?.isSelfie ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testMetadataExtraction();
