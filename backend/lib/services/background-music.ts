import path from 'path';
import fs from 'fs/promises';

/**
 * Background music moods and their associated tracks
 */
export type MusicMood =
  | 'joyful'
  | 'emotional'
  | 'calm'
  | 'adventure'
  | 'funny'
  | 'playful'
  | 'nostalgic'
  | 'uplifting';

/**
 * Music track metadata
 */
export interface MusicTrack {
  id: string;
  filename: string;
  mood: MusicMood;
  duration: number; // seconds
  bpm?: number;
  source: 'epidemic-sound' | 'artlist' | 'custom' | 'ai-generated';
  attribution?: string;
}

/**
 * Curated music library
 *
 * NOTE: In production, replace these with actual licensed tracks from:
 * - Epidemic Sound ($15/month unlimited)
 * - Artlist ($9.99/month)
 * - Or AI-generated tracks from Suno/Mubert
 */
const MUSIC_LIBRARY: MusicTrack[] = [
  // Joyful/Playful
  {
    id: 'joyful-1',
    filename: 'upbeat-playful.mp3',
    mood: 'joyful',
    duration: 60,
    bpm: 120,
    source: 'epidemic-sound',
  },
  {
    id: 'playful-1',
    filename: 'happy-bounce.mp3',
    mood: 'playful',
    duration: 45,
    bpm: 130,
    source: 'epidemic-sound',
  },

  // Emotional/Nostalgic
  {
    id: 'emotional-1',
    filename: 'warm-emotional.mp3',
    mood: 'emotional',
    duration: 60,
    bpm: 80,
    source: 'epidemic-sound',
  },
  {
    id: 'nostalgic-1',
    filename: 'gentle-memories.mp3',
    mood: 'nostalgic',
    duration: 55,
    bpm: 75,
    source: 'artlist',
  },

  // Calm/Gentle
  {
    id: 'calm-1',
    filename: 'gentle-calm.mp3',
    mood: 'calm',
    duration: 50,
    bpm: 70,
    source: 'epidemic-sound',
  },

  // Adventure/Energetic
  {
    id: 'adventure-1',
    filename: 'energetic-adventure.mp3',
    mood: 'adventure',
    duration: 45,
    bpm: 140,
    source: 'epidemic-sound',
  },

  // Funny/Quirky
  {
    id: 'funny-1',
    filename: 'quirky-fun.mp3',
    mood: 'funny',
    duration: 40,
    bpm: 125,
    source: 'artlist',
  },

  // Uplifting
  {
    id: 'uplifting-1',
    filename: 'inspiring-uplifting.mp3',
    mood: 'uplifting',
    duration: 55,
    bpm: 110,
    source: 'epidemic-sound',
  },
];

/**
 * Get music library path from environment or default
 */
function getMusicLibraryPath(): string {
  return process.env.MUSIC_LIBRARY_PATH || path.join(process.cwd(), 'assets', 'music');
}

/**
 * Get any available music file from the library directory
 */
export async function getAnyAvailableMusicFile(): Promise<string | null> {
  try {
    const libraryPath = getMusicLibraryPath();
    const files = await fs.readdir(libraryPath);
    const musicFiles = files.filter((f) => f.match(/\.(mp3|wav|m4a)$/i));

    if (musicFiles.length === 0) {
      console.warn('No music files found in library');
      return null;
    }

    // Return first available music file
    const selectedFile = musicFiles[0];
    console.log(`🎵 Using available music file: ${selectedFile}`);
    return path.join(libraryPath, selectedFile);
  } catch (error) {
    console.error('Error scanning music library:', error);
    return null;
  }
}

/**
 * Select background music track based on mood
 */
export function selectBackgroundMusicByMood(mood: MusicMood): MusicTrack | null {
  const tracks = MUSIC_LIBRARY.filter((track) => track.mood === mood);

  if (tracks.length === 0) {
    console.warn(`No music tracks found for mood: ${mood}, falling back to joyful`);
    return selectBackgroundMusicByMood('joyful');
  }

  // Randomly select one track from the mood category
  const randomIndex = Math.floor(Math.random() * tracks.length);
  return tracks[randomIndex];
}

/**
 * Get full path to music file
 */
export function getMusicFilePath(track: MusicTrack): string {
  const libraryPath = getMusicLibraryPath();
  return path.join(libraryPath, track.filename);
}

/**
 * Check if music file exists
 */
export async function checkMusicFileExists(track: MusicTrack): Promise<boolean> {
  try {
    const filePath = getMusicFilePath(track);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all available music tracks
 */
export function getAllMusicTracks(): MusicTrack[] {
  return MUSIC_LIBRARY;
}

/**
 * Get tracks by source
 */
export function getTracksBySource(source: MusicTrack['source']): MusicTrack[] {
  return MUSIC_LIBRARY.filter((track) => track.source === source);
}

/**
 * Detect mood from highlight content (helper function)
 */
export function detectMoodFromContent(params: {
  title: string;
  summary: string;
  tags?: string[];
}): MusicMood {
  const { title, summary, tags = [] } = params;
  const content = `${title} ${summary} ${tags.join(' ')}`.toLowerCase();

  // Emotion detection keywords
  const moodKeywords: Record<MusicMood, string[]> = {
    joyful: ['happy', 'joy', 'celebration', 'party', 'birthday', 'excited', 'yay'],
    emotional: ['love', 'proud', 'heart', 'touching', 'special', 'precious', 'tears'],
    calm: ['peaceful', 'quiet', 'gentle', 'relaxing', 'nap', 'sleep', 'rest'],
    adventure: ['adventure', 'explore', 'journey', 'trip', 'travel', 'discover', 'outdoor'],
    funny: ['funny', 'silly', 'laugh', 'giggle', 'hilarious', 'joke', 'comedy'],
    playful: ['play', 'fun', 'game', 'playful', 'energetic', 'active', 'bounce'],
    nostalgic: ['memory', 'remember', 'nostalgia', 'grew', 'time flies', 'year ago'],
    uplifting: ['achieve', 'accomplish', 'milestone', 'learned', 'growth', 'proud', 'success'],
  };

  // Count matches for each mood
  const moodScores: Record<MusicMood, number> = {
    joyful: 0,
    emotional: 0,
    calm: 0,
    adventure: 0,
    funny: 0,
    playful: 0,
    nostalgic: 0,
    uplifting: 0,
  };

  for (const [mood, keywords] of Object.entries(moodKeywords)) {
    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        moodScores[mood as MusicMood]++;
      }
    }
  }

  // Find mood with highest score
  let highestMood: MusicMood = 'joyful';
  let highestScore = 0;

  for (const [mood, score] of Object.entries(moodScores)) {
    if (score > highestScore) {
      highestScore = score;
      highestMood = mood as MusicMood;
    }
  }

  // If no matches, default to joyful
  if (highestScore === 0) {
    return 'joyful';
  }

  return highestMood;
}

/**
 * Generate AI music using Suno or Mubert (placeholder)
 *
 * This is for future implementation when you want to generate
 * custom music instead of using pre-licensed tracks
 */
export async function generateAIMusic(params: {
  mood: MusicMood;
  duration: number; // seconds
  prompt?: string;
}): Promise<string> {
  // TODO: Implement AI music generation with Suno or Mubert
  // For now, return path to default track

  console.warn('AI music generation not implemented yet, using pre-licensed track');

  const track = selectBackgroundMusicByMood(params.mood);
  if (!track) {
    throw new Error('No music track available');
  }

  return getMusicFilePath(track);
}

/**
 * Validate music library setup
 */
export async function validateMusicLibrary(): Promise<{
  isValid: boolean;
  missingTracks: string[];
  availableTracks: string[];
}> {
  const missingTracks: string[] = [];
  const availableTracks: string[] = [];

  for (const track of MUSIC_LIBRARY) {
    const exists = await checkMusicFileExists(track);
    if (exists) {
      availableTracks.push(track.filename);
    } else {
      missingTracks.push(track.filename);
    }
  }

  return {
    isValid: missingTracks.length === 0,
    missingTracks,
    availableTracks,
  };
}

/**
 * Helper to setup music library directory
 */
export async function setupMusicLibraryDirectory(): Promise<void> {
  const libraryPath = getMusicLibraryPath();

  try {
    await fs.mkdir(libraryPath, { recursive: true });
    console.log(`✅ Music library directory created: ${libraryPath}`);

    // Create README
    const readme = `# Background Music Library

This folder contains licensed background music tracks for video reels.

## Setup Instructions:

1. **Option 1: Pre-licensed Tracks (Recommended)**
   - Subscribe to Epidemic Sound ($15/month) or Artlist ($9.99/month)
   - Download tracks matching the filenames in this library
   - Place them in this directory

2. **Option 2: Custom Tracks**
   - Add your own royalty-free music files
   - Update the MUSIC_LIBRARY in background-music.ts

## Required Files:

${MUSIC_LIBRARY.map((track) => `- ${track.filename} (${track.mood}, ${track.duration}s)`).join('\n')}

## Note:
Without these files, video generation will fail. Make sure to add at least one track per mood.
`;

    await fs.writeFile(path.join(libraryPath, 'README.md'), readme);
  } catch (error) {
    console.error('Failed to setup music library directory:', error);
  }
}
