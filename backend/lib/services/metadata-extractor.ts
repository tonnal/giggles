import sharp from 'sharp';
import exifParser from 'exif-parser';
import { getDistance } from 'geolib';

/**
 * Comprehensive photo metadata
 */
export interface PhotoMetadata {
  // Basic info
  fileName: string;
  fileSize: number;
  mimeType: string;

  // Image dimensions
  width: number;
  height: number;
  orientation?: number;

  // Date/Time
  dateTaken?: Date;
  dateModified?: Date;
  dateCreated?: Date;

  // Location (GPS)
  location?: {
    latitude: number;
    longitude: number;
    altitude?: number;
    address?: string; // Reverse geocoded address
  };

  // Camera/Device info
  camera?: {
    make?: string;
    model?: string;
    lens?: string;
    software?: string;
  };

  // Photo settings
  settings?: {
    iso?: number;
    exposureTime?: number;
    fNumber?: number;
    focalLength?: number;
    flash?: boolean;
  };

  // Smart detection (for grouping)
  detectedContext?: {
    isIndoor?: boolean;
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    season?: 'spring' | 'summer' | 'fall' | 'winter';
    isSelfie?: boolean;
  };
}

/**
 * Extract comprehensive metadata from image buffer or file path
 */
export async function extractPhotoMetadata(
  input: Buffer | string,
  fileName: string
): Promise<PhotoMetadata> {
  let buffer: Buffer;

  // Load image buffer
  if (typeof input === 'string') {
    buffer = await sharp(input).toBuffer();
  } else {
    buffer = input;
  }

  // Get Sharp metadata
  const sharpMetadata = await sharp(buffer).metadata();

  // Extract EXIF data
  let exifData: any = null;
  try {
    const parser = exifParser.create(buffer);
    exifData = parser.parse();
  } catch (error) {
    console.warn('Failed to parse EXIF data:', error);
  }

  // Build metadata object
  const metadata: PhotoMetadata = {
    fileName,
    fileSize: buffer.length,
    mimeType: sharpMetadata.format ? `image/${sharpMetadata.format}` : 'image/jpeg',
    width: sharpMetadata.width || 0,
    height: sharpMetadata.height || 0,
    orientation: sharpMetadata.orientation,
  };

  // Extract dates
  if (exifData?.tags) {
    const tags = exifData.tags;

    // Date taken (most accurate)
    if (tags.DateTimeOriginal) {
      metadata.dateTaken = new Date(tags.DateTimeOriginal * 1000);
    } else if (tags.DateTime) {
      metadata.dateTaken = new Date(tags.DateTime * 1000);
    }

    if (tags.ModifyDate) {
      metadata.dateModified = new Date(tags.ModifyDate * 1000);
    }

    if (tags.CreateDate) {
      metadata.dateCreated = new Date(tags.CreateDate * 1000);
    }
  }

  // Extract GPS location
  if (exifData?.tags?.GPSLatitude && exifData?.tags?.GPSLongitude) {
    metadata.location = {
      latitude: exifData.tags.GPSLatitude,
      longitude: exifData.tags.GPSLongitude,
      altitude: exifData.tags.GPSAltitude,
    };
  }

  // Extract camera info
  if (exifData?.tags) {
    const tags = exifData.tags;

    metadata.camera = {
      make: tags.Make,
      model: tags.Model,
      lens: tags.LensModel,
      software: tags.Software,
    };

    metadata.settings = {
      iso: tags.ISO,
      exposureTime: tags.ExposureTime,
      fNumber: tags.FNumber,
      focalLength: tags.FocalLength,
      flash: tags.Flash !== undefined && tags.Flash !== 0,
    };
  }

  // Smart context detection
  metadata.detectedContext = detectPhotoContext(metadata);

  return metadata;
}

/**
 * Detect photo context for smart grouping
 */
function detectPhotoContext(metadata: PhotoMetadata): PhotoMetadata['detectedContext'] {
  const context: PhotoMetadata['detectedContext'] = {};

  // Detect time of day from EXIF timestamp
  if (metadata.dateTaken) {
    const hour = metadata.dateTaken.getHours();
    if (hour >= 5 && hour < 12) context.timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) context.timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) context.timeOfDay = 'evening';
    else context.timeOfDay = 'night';

    // Detect season (Northern Hemisphere)
    const month = metadata.dateTaken.getMonth();
    if (month >= 2 && month <= 4) context.season = 'spring';
    else if (month >= 5 && month <= 7) context.season = 'summer';
    else if (month >= 8 && month <= 10) context.season = 'fall';
    else context.season = 'winter';
  }

  // Detect indoor/outdoor from flash usage and ISO
  if (metadata.settings) {
    if (metadata.settings.flash || (metadata.settings.iso && metadata.settings.iso > 800)) {
      context.isIndoor = true;
    } else {
      context.isIndoor = false;
    }
  }

  // Detect selfie from camera model (front camera keywords)
  if (metadata.camera?.lens?.toLowerCase().includes('front')) {
    context.isSelfie = true;
  }

  return context;
}

/**
 * Group photos by location proximity
 * Returns groups of photo IDs that are within distanceThresholdMeters
 */
export function groupPhotosByLocation(
  photos: Array<{ id: string; metadata: PhotoMetadata }>,
  distanceThresholdMeters: number = 100 // 100m = same location
): Array<Array<string>> {
  const groups: Array<Array<string>> = [];
  const processed = new Set<string>();

  for (const photo of photos) {
    if (processed.has(photo.id) || !photo.metadata.location) continue;

    const group = [photo.id];
    processed.add(photo.id);

    // Find all photos near this location
    for (const otherPhoto of photos) {
      if (processed.has(otherPhoto.id) || !otherPhoto.metadata.location) continue;

      const distance = getDistance(
        {
          latitude: photo.metadata.location.latitude,
          longitude: photo.metadata.location.longitude,
        },
        {
          latitude: otherPhoto.metadata.location.latitude,
          longitude: otherPhoto.metadata.location.longitude,
        }
      );

      if (distance <= distanceThresholdMeters) {
        group.push(otherPhoto.id);
        processed.add(otherPhoto.id);
      }
    }

    groups.push(group);
  }

  return groups;
}

/**
 * Group photos by time proximity (same day, same trip, etc.)
 */
export function groupPhotosByTime(
  photos: Array<{ id: string; metadata: PhotoMetadata }>,
  maxHoursBetween: number = 24 // Photos within 24 hours are in same group
): Array<Array<string>> {
  // Sort by date
  const sorted = [...photos].sort((a, b) => {
    const dateA = a.metadata.dateTaken || a.metadata.dateCreated || new Date(0);
    const dateB = b.metadata.dateTaken || b.metadata.dateCreated || new Date(0);
    return dateA.getTime() - dateB.getTime();
  });

  const groups: Array<Array<string>> = [];
  let currentGroup: string[] = [];
  let lastDate: Date | null = null;

  for (const photo of sorted) {
    const photoDate = photo.metadata.dateTaken || photo.metadata.dateCreated;
    if (!photoDate) continue;

    if (!lastDate || (photoDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60) <= maxHoursBetween) {
      currentGroup.push(photo.id);
    } else {
      if (currentGroup.length > 0) groups.push(currentGroup);
      currentGroup = [photo.id];
    }

    lastDate = photoDate;
  }

  if (currentGroup.length > 0) groups.push(currentGroup);

  return groups;
}

/**
 * Smart album suggestions based on metadata patterns
 */
export interface AlbumSuggestion {
  name: string;
  photoIds: string[];
  reason: string;
  confidence: number; // 0-1
}

export function suggestSmartAlbums(
  photos: Array<{ id: string; metadata: PhotoMetadata }>
): AlbumSuggestion[] {
  const suggestions: AlbumSuggestion[] = [];

  // 1. Trip detection (same location for 3+ days with gaps in between)
  const locationGroups = groupPhotosByLocation(photos, 500); // 500m threshold for trips

  for (const group of locationGroups) {
    if (group.length < 5) continue; // At least 5 photos

    const groupPhotos = photos.filter((p) => group.includes(p.id));
    const dates = groupPhotos
      .map((p) => p.metadata.dateTaken)
      .filter((d): d is Date => d !== undefined)
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length >= 5) {
      const daySpan = (dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24);

      if (daySpan >= 2 && daySpan <= 14) {
        // Trip detected! (2-14 days)
        const location = groupPhotos[0].metadata.location;
        suggestions.push({
          name: `Trip ${dates[0].toLocaleDateString()}`,
          photoIds: group,
          reason: `${group.length} photos from ${Math.ceil(daySpan)} days at same location`,
          confidence: 0.9,
        });
      }
    }
  }

  // 2. Event detection (many photos in short time span)
  const timeGroups = groupPhotosByTime(photos, 4); // 4 hours

  for (const group of timeGroups) {
    if (group.length >= 10) {
      // Event detected (10+ photos in 4 hours)
      const groupPhotos = photos.filter((p) => group.includes(p.id));
      const date = groupPhotos[0].metadata.dateTaken;

      suggestions.push({
        name: `Event ${date?.toLocaleDateString() || 'Unknown'}`,
        photoIds: group,
        reason: `${group.length} photos taken within 4 hours`,
        confidence: 0.85,
      });
    }
  }

  // 3. Seasonal grouping
  const seasonGroups: Record<string, string[]> = {
    spring: [],
    summer: [],
    fall: [],
    winter: [],
  };

  for (const photo of photos) {
    const season = photo.metadata.detectedContext?.season;
    if (season) {
      seasonGroups[season].push(photo.id);
    }
  }

  for (const [season, photoIds] of Object.entries(seasonGroups)) {
    if (photoIds.length >= 10) {
      suggestions.push({
        name: `${season.charAt(0).toUpperCase() + season.slice(1)} Memories`,
        photoIds,
        reason: `${photoIds.length} photos from ${season}`,
        confidence: 0.7,
      });
    }
  }

  // 4. Selfies collection
  const selfies = photos.filter((p) => p.metadata.detectedContext?.isSelfie);
  if (selfies.length >= 5) {
    suggestions.push({
      name: 'Selfies',
      photoIds: selfies.map((p) => p.id),
      reason: `${selfies.length} selfie photos`,
      confidence: 0.8,
    });
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Reverse geocode coordinates to address (placeholder - integrate with Google Maps API)
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  // TODO: Integrate with Google Maps Geocoding API
  // For now, return a placeholder

  // Example implementation:
  // const response = await fetch(
  //   `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`
  // );
  // const data = await response.json();
  // return data.results[0]?.formatted_address || null;

  console.log(`TODO: Reverse geocode ${latitude}, ${longitude}`);
  return null;
}
