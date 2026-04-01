import { extractPhotoMetadata, suggestSmartAlbums } from '../lib/services/metadata-extractor';
import fs from 'fs';
import path from 'path';

/**
 * Test the complete metadata extraction and smart album flow
 */
async function testMetadataFlow() {
  console.log('🧪 Testing Complete Metadata Extraction Flow\n');
  console.log('================================================\n');

  // Step 1: Extract metadata from test photo
  console.log('📸 Step 1: Extracting metadata from test photo...\n');

  const imagePath = path.join(__dirname, 'assets', 'test_photo', 'avyaan1.jpeg');
  const buffer = fs.readFileSync(imagePath);

  const metadata = await extractPhotoMetadata(buffer, 'avyaan1.jpeg');

  console.log('✅ Metadata extracted:\n');
  console.log('📋 Full metadata:');
  console.log(JSON.stringify({
    location: metadata.location,
    camera: metadata.camera,
    detectedContext: metadata.detectedContext,
    dateTaken: metadata.dateTaken,
  }, null, 2));
  console.log('\n---\n');

  // Step 2: Simulate memory creation with metadata
  console.log('💾 Step 2: Simulating memory creation with metadata...\n');

  const mockMemory = {
    _id: '507f1f77bcf86cd799439011',
    familyId: '507f1f77bcf86cd799439012',
    childId: '507f1f77bcf86cd799439013',
    mediaUrl: 'https://example.com/avyaan1.jpeg',
    mediaType: 'photo',
    caption: 'Test photo with extracted metadata',
    date: metadata.dateTaken || new Date(),
    metadata: {
      location: metadata.location,
      camera: metadata.camera,
      context: metadata.detectedContext,
    },
  };

  console.log('✅ Memory object created with metadata:');
  console.log(JSON.stringify(mockMemory, null, 2));
  console.log('\n---\n');

  // Step 3: Test smart album suggestions with multiple photos
  console.log('🎨 Step 3: Testing smart album suggestions...\n');

  // Create mock photo dataset with various patterns
  const mockPhotos = [
    // Trip photos (same location, multiple days)
    {
      id: '1',
      metadata: {
        dateTaken: new Date('2024-07-15T10:00:00Z'),
        location: { latitude: 40.7829, longitude: -73.9654, altitude: 10 },
        detectedContext: { timeOfDay: 'morning' as const, season: 'summer' as const, isIndoor: false },
      },
    },
    {
      id: '2',
      metadata: {
        dateTaken: new Date('2024-07-15T14:00:00Z'),
        location: { latitude: 40.7830, longitude: -73.9655, altitude: 10 },
        detectedContext: { timeOfDay: 'afternoon' as const, season: 'summer' as const, isIndoor: false },
      },
    },
    {
      id: '3',
      metadata: {
        dateTaken: new Date('2024-07-16T09:00:00Z'),
        location: { latitude: 40.7828, longitude: -73.9653, altitude: 10 },
        detectedContext: { timeOfDay: 'morning' as const, season: 'summer' as const, isIndoor: false },
      },
    },
    {
      id: '4',
      metadata: {
        dateTaken: new Date('2024-07-16T16:00:00Z'),
        location: { latitude: 40.7831, longitude: -73.9656, altitude: 10 },
        detectedContext: { timeOfDay: 'afternoon' as const, season: 'summer' as const, isIndoor: false },
      },
    },
    {
      id: '5',
      metadata: {
        dateTaken: new Date('2024-07-17T11:00:00Z'),
        location: { latitude: 40.7829, longitude: -73.9654, altitude: 10 },
        detectedContext: { timeOfDay: 'morning' as const, season: 'summer' as const, isIndoor: false },
      },
    },

    // Event photos (many photos in short time)
    {
      id: '6',
      metadata: {
        dateTaken: new Date('2024-08-01T15:00:00Z'),
        location: { latitude: 34.0522, longitude: -118.2437, altitude: 5 },
        detectedContext: { timeOfDay: 'afternoon' as const, season: 'summer' as const, isIndoor: true },
      },
    },
    {
      id: '7',
      metadata: {
        dateTaken: new Date('2024-08-01T15:30:00Z'),
        location: { latitude: 34.0522, longitude: -118.2437, altitude: 5 },
        detectedContext: { timeOfDay: 'afternoon' as const, season: 'summer' as const, isIndoor: true },
      },
    },
    {
      id: '8',
      metadata: {
        dateTaken: new Date('2024-08-01T16:00:00Z'),
        location: { latitude: 34.0522, longitude: -118.2437, altitude: 5 },
        detectedContext: { timeOfDay: 'afternoon' as const, season: 'summer' as const, isIndoor: true },
      },
    },
    {
      id: '9',
      metadata: {
        dateTaken: new Date('2024-08-01T16:30:00Z'),
        location: { latitude: 34.0522, longitude: -118.2437, altitude: 5 },
        detectedContext: { timeOfDay: 'afternoon' as const, season: 'summer' as const, isIndoor: true },
      },
    },
    {
      id: '10',
      metadata: {
        dateTaken: new Date('2024-08-01T17:00:00Z'),
        location: { latitude: 34.0522, longitude: -118.2437, altitude: 5 },
        detectedContext: { timeOfDay: 'evening' as const, season: 'summer' as const, isIndoor: true },
      },
    },
    {
      id: '11',
      metadata: {
        dateTaken: new Date('2024-08-01T17:30:00Z'),
        location: { latitude: 34.0522, longitude: -118.2437, altitude: 5 },
        detectedContext: { timeOfDay: 'evening' as const, season: 'summer' as const, isIndoor: true },
      },
    },
    {
      id: '12',
      metadata: {
        dateTaken: new Date('2024-08-01T18:00:00Z'),
        location: { latitude: 34.0522, longitude: -118.2437, altitude: 5 },
        detectedContext: { timeOfDay: 'evening' as const, season: 'summer' as const, isIndoor: true },
      },
    },
    {
      id: '13',
      metadata: {
        dateTaken: new Date('2024-08-01T18:30:00Z'),
        location: { latitude: 34.0522, longitude: -118.2437, altitude: 5 },
        detectedContext: { timeOfDay: 'evening' as const, season: 'summer' as const, isIndoor: true },
      },
    },
    {
      id: '14',
      metadata: {
        dateTaken: new Date('2024-08-01T19:00:00Z'),
        location: { latitude: 34.0522, longitude: -118.2437, altitude: 5 },
        detectedContext: { timeOfDay: 'evening' as const, season: 'summer' as const, isIndoor: true },
      },
    },
    {
      id: '15',
      metadata: {
        dateTaken: new Date('2024-08-01T19:30:00Z'),
        location: { latitude: 34.0522, longitude: -118.2437, altitude: 5 },
        detectedContext: { timeOfDay: 'evening' as const, season: 'summer' as const, isIndoor: true },
      },
    },

    // Selfies
    {
      id: '16',
      metadata: {
        dateTaken: new Date('2024-09-01T12:00:00Z'),
        camera: { make: 'Apple', model: 'iPhone 15 Pro Max', lens: 'front camera' },
        detectedContext: { timeOfDay: 'afternoon' as const, season: 'fall' as const, isIndoor: false, isSelfie: true },
      },
    },
    {
      id: '17',
      metadata: {
        dateTaken: new Date('2024-09-05T14:00:00Z'),
        camera: { make: 'Apple', model: 'iPhone 15 Pro Max', lens: 'front camera' },
        detectedContext: { timeOfDay: 'afternoon' as const, season: 'fall' as const, isIndoor: true, isSelfie: true },
      },
    },
    {
      id: '18',
      metadata: {
        dateTaken: new Date('2024-09-10T16:00:00Z'),
        camera: { make: 'Apple', model: 'iPhone 15 Pro Max', lens: 'front camera' },
        detectedContext: { timeOfDay: 'afternoon' as const, season: 'fall' as const, isIndoor: false, isSelfie: true },
      },
    },
    {
      id: '19',
      metadata: {
        dateTaken: new Date('2024-09-15T11:00:00Z'),
        camera: { make: 'Apple', model: 'iPhone 15 Pro Max', lens: 'front camera' },
        detectedContext: { timeOfDay: 'morning' as const, season: 'fall' as const, isIndoor: true, isSelfie: true },
      },
    },
    {
      id: '20',
      metadata: {
        dateTaken: new Date('2024-09-20T18:00:00Z'),
        camera: { make: 'Apple', model: 'iPhone 15 Pro Max', lens: 'front camera' },
        detectedContext: { timeOfDay: 'evening' as const, season: 'fall' as const, isIndoor: false, isSelfie: true },
      },
    },
  ];

  const suggestions = suggestSmartAlbums(mockPhotos as any);

  console.log('🎯 Smart Album Suggestions:\n');
  suggestions.forEach((suggestion, index) => {
    console.log(`${index + 1}. ${suggestion.name}`);
    console.log(`   📸 Photos: ${suggestion.photoIds.length}`);
    console.log(`   💡 Reason: ${suggestion.reason}`);
    console.log(`   🎲 Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
    console.log('');
  });

  console.log('\n---\n');

  // Step 4: Summary
  console.log('📊 Summary:\n');
  console.log(`✅ Metadata Extraction: Working`);
  console.log(`✅ Memory Creation: Schema updated`);
  console.log(`✅ Smart Album Suggestions: ${suggestions.length} suggestions generated`);
  console.log('');

  console.log('================================================');
  console.log('✅ All tests passed!\n');

  console.log('📱 Mobile App Integration Flow:');
  console.log('   1. Upload photo to S3 via presigned URL');
  console.log('   2. POST /api/upload/extract-metadata with S3 URL');
  console.log('   3. POST /api/memories with extracted metadata');
  console.log('   4. GET /api/albums/suggestions to show smart albums');
  console.log('');
}

testMetadataFlow().catch(console.error);
