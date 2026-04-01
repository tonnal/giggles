import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import { createCanvas, loadImage, registerFont } from 'canvas';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Types } from 'mongoose';
import { Memory, Child } from '@/lib/db/models';
import { uploadToS3 } from './s3';
import OpenAI from 'openai';

// NOTE: FFmpeg must be installed system-wide
// macOS: brew install ffmpeg
// Ubuntu: sudo apt-get install ffmpeg
// Windows: Download from https://ffmpeg.org/download.html

// Emergent Integration Proxy URL for universal LLM key
const EMERGENT_BASE_URL = process.env.INTEGRATION_PROXY_URL 
  ? `${process.env.INTEGRATION_PROXY_URL}/openai`
  : 'https://integrations.emergentagent.com/openai';

const openai = new OpenAI({
  apiKey: process.env.EMERGENT_LLM_KEY || process.env.OPENAI_API_KEY || 'placeholder',
  baseURL: process.env.EMERGENT_LLM_KEY ? EMERGENT_BASE_URL : undefined,
});

// Types
export interface VideoReelInput {
  childId: Types.ObjectId;
  familyId: Types.ObjectId;
  memoryIds: Types.ObjectId[];
  title: string;
  narrationText: string;
  textOverlays?: TextOverlay[];
  duration?: number; // Target duration in seconds
  quality?: 'fast' | 'premium';
  backgroundMusicPath?: string;
}

export interface TextOverlay {
  text: string;
  startTime: number; // seconds
  duration: number; // seconds
  animation?: 'fade' | 'slide-up' | 'bounce' | 'typewriter';
  position?: 'top' | 'center' | 'bottom';
}

export interface VideoReelOutput {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  format: string;
}

interface KenBurnsEffect {
  zoom: 'in' | 'out';
  pan: 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top' | 'none';
}

// NEW: Creative presentation modes for VIRAL-WORTHY content (Gen Z oriented!)
type PresentationMode =
  | 'ken-burns'      // Classic zoom/pan
  | 'spin-zoom'      // Rotate while zooming (COOL!)
  | 'split-screen'   // Show 2-4 photos at once
  | 'collage-grid'   // Grid of 4-6 photos flying in
  | 'polaroid'       // Polaroid frame style with rotation
  | 'shake-zoom'     // Camera shake effect
  | 'bounce-reveal'  // Bouncy elastic entrance
  | 'slide-reveal'   // Slide in from side with momentum
  | 'glitch'         // Digital glitch effect (Gen Z vibe!)
  | 'vhs-retro'      // VHS/vintage camera look
  | '3d-tilt'        // 3D perspective tilt shift
  | 'neon-glow'      // Neon cyberpunk glow effect
  | 'chromatic'      // RGB split chromatic aberration
  | 'film-burn'      // Old film burn effect
  | 'zoom-blur'      // Speed ramp zoom blur
  | 'black-white'    // High contrast B&W
  | 'vintage-fade';  // Washed out pastel colors

interface CreativeEffect {
  mode: PresentationMode;
  kenBurns?: KenBurnsEffect;
  intensity?: number; // 1-10 for shake/rotation/effect intensity
  color?: string;     // Optional color for neon/glow effects
}

/**
 * Main function to generate professional video reel
 */
export async function generateVideoReel(
  input: VideoReelInput,
  onProgress?: (progress: { stage: string; progress: number }) => void
): Promise<VideoReelOutput> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'giggles-reel-'));

  try {
    console.log('🎬 Starting video reel generation:', {
      childId: input.childId,
      memoryCount: input.memoryIds.length,
      quality: input.quality || 'fast'
    });

    // Stage 1: Download and optimize photos (20% progress)
    onProgress?.({ stage: 'Downloading memories...', progress: 10 });
    const optimizedPhotos = await downloadAndOptimizePhotos(input.memoryIds, tempDir);
    onProgress?.({ stage: 'Photos optimized', progress: 20 });

    // Stage 2: Generate narration audio (30% progress)
    onProgress?.({ stage: 'Generating narration...', progress: 25 });
    const narrationPath = await generateNarrationAudio(input.narrationText, tempDir);
    onProgress?.({ stage: 'Narration complete', progress: 30 });

    // Stage 3: Mix audio tracks (40% progress)
    onProgress?.({ stage: 'Mixing audio...', progress: 35 });
    const finalAudioPath = await mixAudioTracks(
      narrationPath,
      input.backgroundMusicPath,
      tempDir
    );
    onProgress?.({ stage: 'Audio ready', progress: 40 });

    // Stage 4: Create Ken Burns clips (60% progress)
    onProgress?.({ stage: 'Creating video clips...', progress: 45 });
    const videoClips = await createKenBurnsClips(optimizedPhotos, tempDir, input.quality);
    onProgress?.({ stage: 'Clips created', progress: 60 });

    // Stage 5: Add text overlays (75% progress)
    onProgress?.({ stage: 'Adding text overlays...', progress: 65 });
    const videoWithTextPath = await addTextOverlays(
      videoClips,
      input.textOverlays || [],
      tempDir
    );
    onProgress?.({ stage: 'Text overlays added', progress: 75 });

    // Stage 6: Create transitions and assemble (85% progress)
    onProgress?.({ stage: 'Assembling final video...', progress: 80 });
    const assembledVideoPath = await assembleVideoWithTransitions(
      videoWithTextPath,
      tempDir,
      input.quality
    );
    onProgress?.({ stage: 'Video assembled', progress: 85 });

    // Stage 7: Add audio and watermark (95% progress)
    onProgress?.({ stage: 'Adding audio and branding...', progress: 90 });
    const finalVideoPath = await finalizeVideo(
      assembledVideoPath,
      finalAudioPath,
      tempDir
    );
    onProgress?.({ stage: 'Finalizing...', progress: 95 });

    // Stage 8: Generate thumbnail and upload (100% progress)
    onProgress?.({ stage: 'Uploading...', progress: 97 });
    const thumbnailPath = await generateThumbnail(finalVideoPath, tempDir);

    const [videoUrl, thumbnailUrl] = await Promise.all([
      uploadVideoToS3(finalVideoPath, input.childId),
      uploadToS3({
        buffer: await fs.readFile(thumbnailPath),
        fileName: `thumbnail-${Date.now()}.jpg`,
        contentType: 'image/jpeg',
        folder: 'reels/thumbnails',
      }),
    ]);

    onProgress?.({ stage: 'Complete!', progress: 100 });

    // Get video duration
    const duration = await getVideoDuration(finalVideoPath);

    console.log('✅ Video reel generated successfully:', videoUrl);

    return {
      videoUrl,
      thumbnailUrl,
      duration,
      format: '1080x1920',
    };
  } catch (error) {
    console.error('❌ Video reel generation failed:', error);
    throw error;
  } finally {
    // Cleanup temp files
    await fs.rm(tempDir, { recursive: true, force: true }).catch(console.error);
  }
}

/**
 * Download memories and optimize for vertical video (1080x1920)
 */
async function downloadAndOptimizePhotos(
  memoryIds: Types.ObjectId[],
  tempDir: string
): Promise<string[]> {
  const memories = await Memory.find({ _id: { $in: memoryIds } })
    .sort({ date: 1 })
    .lean();

  const optimizedPaths: string[] = [];

  for (let i = 0; i < memories.length; i++) {
    const memory = memories[i];
    const outputPath = path.join(tempDir, `photo-${i}.jpg`);

    try {
      let buffer: Buffer;

      // Handle local file:// URLs (for testing) or remote URLs
      if (memory.mediaUrl.startsWith('file://')) {
        const localPath = memory.mediaUrl.replace('file://', '');
        buffer = await fs.readFile(localPath);
        console.log(`📁 Loaded local file: ${localPath}`);
      } else {
        // Download image from S3 URL or remote URL
        const response = await fetch(memory.mediaUrl);
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        console.log(`🌐 Downloaded remote file: ${memory.mediaUrl}`);
      }

      // Resize to 1080x1920 (9:16 vertical for Reels)
      await sharp(buffer)
        .resize(1080, 1920, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 90 })
        .toFile(outputPath);

      optimizedPaths.push(outputPath);
      console.log(`✅ Photo ${i + 1}/${memories.length} optimized`);
    } catch (error) {
      console.error(`Error processing photo ${i}:`, error);
      throw error;
    }
  }

  return optimizedPaths;
}

/**
 * Generate audio narration using OpenAI TTS
 */
async function generateNarrationAudio(
  text: string,
  tempDir: string
): Promise<string> {
  const outputPath = path.join(tempDir, 'narration.mp3');

  const mp3Response = await openai.audio.speech.create({
    model: 'tts-1-hd', // Higher quality
    voice: 'nova',
    input: text,
    speed: 0.95,
  });

  const buffer = Buffer.from(await mp3Response.arrayBuffer());
  await fs.writeFile(outputPath, buffer);

  return outputPath;
}

/**
 * Mix narration with background music
 * Target duration: 30 seconds (5 photos × 6.5 seconds)
 */
async function mixAudioTracks(
  narrationPath: string,
  backgroundMusicPath: string | undefined,
  tempDir: string
): Promise<string> {
  const outputPath = path.join(tempDir, 'final-audio.mp3');
  const targetDuration = 30; // 5 clips × 6.5s - transitions = ~30s

  return new Promise((resolve, reject) => {
    if (!backgroundMusicPath) {
      // No background music, trim narration to target duration
      ffmpeg(narrationPath)
        .outputOptions(['-t', targetDuration.toString()])
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .save(outputPath);
      return;
    }

    // Mix narration (100% volume) with background music (25% volume)
    // Both trimmed to target duration to prevent video repetition
    ffmpeg()
      .input(backgroundMusicPath)
      .input(narrationPath)
      .complexFilter([
        `[0:a]volume=0.25,afade=t=in:st=0:d=1,afade=t=out:st=${targetDuration - 2}:d=2[music]`,
        '[1:a]adelay=500|500[narration]', // Start narration 0.5s in
        '[music][narration]amix=inputs=2:duration=first:dropout_transition=2', // Use 'first' not 'longest'!
      ])
      .outputOptions(['-t', targetDuration.toString()]) // Force maximum duration
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath);
  });
}

/**
 * Create CREATIVE effect clips for each photo - VIRAL-WORTHY! 🔥
 */
async function createKenBurnsClips(
  photoPaths: string[],
  tempDir: string,
  quality?: 'fast' | 'premium'
): Promise<string[]> {
  const clipPaths: string[] = [];

  // MIX OF CREATIVE EFFECTS - Gen Z Instagram viral vibes! 🔥
  const creativeEffects: CreativeEffect[] = [
    // Classic smooth
    { mode: 'ken-burns', kenBurns: { zoom: 'in', pan: 'left-to-right' } },
    // Digital & glitchy
    { mode: 'glitch', kenBurns: { zoom: 'in', pan: 'none' }, intensity: 7 },
    { mode: 'ken-burns', kenBurns: { zoom: 'out', pan: 'right-to-left' } },
    // Retro vibes
    { mode: 'vhs-retro', kenBurns: { zoom: 'in', pan: 'bottom-to-top' }, intensity: 6 },
    { mode: 'black-white', kenBurns: { zoom: 'out', pan: 'left-to-right' }, intensity: 8 },
    // 3D & modern
    { mode: '3d-tilt', kenBurns: { zoom: 'out', pan: 'top-to-bottom' }, intensity: 5 },
    { mode: 'neon-glow', kenBurns: { zoom: 'in', pan: 'left-to-right' }, intensity: 6, color: '#00ffff' },
    // Energetic
    { mode: 'shake-zoom', kenBurns: { zoom: 'in', pan: 'bottom-to-top' }, intensity: 5 },
    { mode: 'chromatic', kenBurns: { zoom: 'out', pan: 'right-to-left' }, intensity: 4 },
    // Artistic
    { mode: 'vintage-fade', kenBurns: { zoom: 'in', pan: 'none' }, intensity: 6 },
    { mode: 'polaroid', kenBurns: { zoom: 'in', pan: 'none' }, intensity: 4 },
    // Speed effects
    { mode: 'zoom-blur', kenBurns: { zoom: 'in', pan: 'none' }, intensity: 8 },
    { mode: 'spin-zoom', kenBurns: { zoom: 'in', pan: 'none' }, intensity: 6 },
    // Cinematic
    { mode: 'film-burn', kenBurns: { zoom: 'out', pan: 'top-to-bottom' }, intensity: 5 },
    { mode: 'bounce-reveal', kenBurns: { zoom: 'in', pan: 'left-to-right' }, intensity: 7 },
    { mode: 'slide-reveal', kenBurns: { zoom: 'out', pan: 'right-to-left' }, intensity: 8 },
  ];

  // DYNAMIC DURATION - Target 30 seconds total for reels!
  const TARGET_REEL_DURATION = 30; // seconds
  const TRANSITION_DURATION = 0.3; // seconds per transition
  const totalTransitionTime = (photoPaths.length - 1) * TRANSITION_DURATION;

  // Calculate clip duration to reach exactly 30 seconds
  // For few photos (5): ~6s each, For many photos (15+): ~1.8s each (fast cuts)
  const clipDuration = Math.max(
    1.8, // Minimum 1.8s for fast-paced engagement
    Math.min(
      6.0, // Maximum 6s per clip to avoid boredom
      (TARGET_REEL_DURATION - totalTransitionTime) / photoPaths.length
    )
  );

  console.log(`🎬 Creating ${photoPaths.length} clips at ${clipDuration.toFixed(1)}s each (target: ${TARGET_REEL_DURATION}s total)`);


  for (let i = 0; i < photoPaths.length; i++) {
    const photoPath = photoPaths[i];
    const outputPath = path.join(tempDir, `clip-${i}.mp4`);
    const effect = creativeEffects[i % creativeEffects.length];

    await createCreativeClip(photoPath, outputPath, effect, clipDuration, quality);
    clipPaths.push(outputPath);
  }

  // Store clip duration for concatenation
  (clipPaths as any).clipDuration = clipDuration;

  return clipPaths;
}

/**
 * Create a single clip with creative effects
 */
async function createCreativeClip(
  photoPath: string,
  outputPath: string,
  effect: CreativeEffect,
  duration: number,
  quality?: 'fast' | 'premium'
): Promise<void> {
  // Route to appropriate effect creator
  switch (effect.mode) {
    case 'ken-burns':
      return createSingleKenBurnsClip(photoPath, outputPath, effect.kenBurns!, duration, quality);

    case 'spin-zoom':
      return createSpinZoomClip(photoPath, outputPath, effect, duration, quality);

    case 'shake-zoom':
      return createShakeZoomClip(photoPath, outputPath, effect, duration, quality);

    case 'polaroid':
      return createPolaroidClip(photoPath, outputPath, effect, duration, quality);

    case 'bounce-reveal':
      return createBounceRevealClip(photoPath, outputPath, effect, duration, quality);

    case 'slide-reveal':
      return createSlideRevealClip(photoPath, outputPath, effect, duration, quality);

    // Gen Z Effects! 🔥
    case 'glitch':
      return createGlitchClip(photoPath, outputPath, effect, duration, quality);

    case 'vhs-retro':
      return createVHSRetroClip(photoPath, outputPath, effect, duration, quality);

    case '3d-tilt':
      return create3DTiltClip(photoPath, outputPath, effect, duration, quality);

    case 'neon-glow':
      return createNeonGlowClip(photoPath, outputPath, effect, duration, quality);

    case 'chromatic':
      return createChromaticClip(photoPath, outputPath, effect, duration, quality);

    case 'film-burn':
      return createFilmBurnClip(photoPath, outputPath, effect, duration, quality);

    case 'zoom-blur':
      return createZoomBlurClip(photoPath, outputPath, effect, duration, quality);

    case 'black-white':
      return createBlackWhiteClip(photoPath, outputPath, effect, duration, quality);

    case 'vintage-fade':
      return createVintageFadeClip(photoPath, outputPath, effect, duration, quality);

    default:
      // Fallback to Ken Burns
      return createSingleKenBurnsClip(photoPath, outputPath, effect.kenBurns!, duration, quality);
  }
}

/**
 * Create a single Ken Burns effect clip
 */
function createSingleKenBurnsClip(
  photoPath: string,
  outputPath: string,
  effect: KenBurnsEffect,
  duration: number,
  quality?: 'fast' | 'premium'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fps = 30;
    const frames = duration * fps;

    // DYNAMIC ZOOM/PAN SPEEDS - Adjusted for clip duration!
    // Zoom from 1.0 to 1.3 (0.3 change) over FULL clip duration
    const zoomChange = 0.3;
    const zoomPerFrame = zoomChange / frames;

    // Pan movement: 160 pixels horizontal, 120 pixels vertical over FULL duration
    const panDistanceX = 160; // Total horizontal pan distance
    const panDistanceY = 120; // Total vertical pan distance
    const panSpeedX = panDistanceX / frames;
    const panSpeedY = panDistanceY / frames;

    // Build dynamic zoom and pan based on effect parameter
    let zoomExpression: string;
    let xExpression: string;
    let yExpression: string;

    // Dynamic zoom - completes over full clip duration
    if (effect.zoom === 'in') {
      zoomExpression = `min(zoom+${zoomPerFrame.toFixed(6)},1.3)`;
    } else {
      zoomExpression = `max(1.3-on*${zoomPerFrame.toFixed(6)},1.0)`;
    }

    // Dynamic pan - completes over full clip duration
    const startOffsetX = panDistanceX / 2;
    const startOffsetY = panDistanceY / 2;

    switch (effect.pan) {
      case 'left-to-right':
        xExpression = `iw/2-(iw/zoom/2)-${startOffsetX}+on*${panSpeedX.toFixed(3)}`;
        yExpression = 'ih/2-(ih/zoom/2)';
        break;
      case 'right-to-left':
        xExpression = `iw/2-(iw/zoom/2)+${startOffsetX}-on*${panSpeedX.toFixed(3)}`;
        yExpression = 'ih/2-(ih/zoom/2)';
        break;
      case 'top-to-bottom':
        xExpression = 'iw/2-(iw/zoom/2)';
        yExpression = `ih/2-(ih/zoom/2)-${startOffsetY}+on*${panSpeedY.toFixed(3)}`;
        break;
      case 'bottom-to-top':
        xExpression = 'iw/2-(iw/zoom/2)';
        yExpression = `ih/2-(ih/zoom/2)+${startOffsetY}-on*${panSpeedY.toFixed(3)}`;
        break;
      default:
        xExpression = 'iw/2-(iw/zoom/2)';
        yExpression = 'ih/2-(ih/zoom/2)';
    }

    console.log(`🎬 Ken Burns (${duration.toFixed(1)}s): zoom ${zoomPerFrame.toFixed(6)}/frame, pan ${panSpeedX.toFixed(3)}px/frame`);

    const zoomFilter = `scale=1080:1920,setsar=1:1,zoompan=z='${zoomExpression}':d=${frames}:x='${xExpression}':y='${yExpression}':s=1080x1920:fps=${fps}`;

    console.log(`🎬 Ken Burns filter for ${effect.zoom}/${effect.pan}:`, zoomFilter.substring(0, 150) + '...');

    ffmpeg(photoPath)
      .inputOptions([
        '-loop', '1',
        '-framerate', '30',  // CRITICAL: Explicitly set input framerate
        '-t', duration.toString()
      ])
      .videoFilters([
        zoomFilter,
        'format=yuv420p'
      ])
      .videoCodec('libx264')
      .outputOptions([
        '-preset', quality === 'premium' ? 'slow' : 'superfast',
        '-crf', quality === 'premium' ? '20' : '26',
        '-pix_fmt', 'yuv420p',
        '-t', duration.toString()
      ])
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error(`Error processing ${photoPath}:`, err);
        console.error(`Failed filter:`, zoomFilter);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * 🌀 SPIN-ZOOM: Photo rotates while zooming - SUPER COOL!
 */
function createSpinZoomClip(
  photoPath: string,
  outputPath: string,
  effect: CreativeEffect,
  duration: number,
  quality?: 'fast' | 'premium'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fps = 30;
    const frames = duration * fps;
    const intensity = effect.intensity || 5;

    // Rotation: Dynamic based on duration (smooth over full clip)
    const totalRotation = intensity * 60; // degrees (60° for gentle spin, 360° for full spin)
    const rotationPerFrame = totalRotation / frames;

    // Dynamic zoom - completes over full clip duration
    const zoomChange = 0.3;
    const zoomPerFrame = zoomChange / frames;
    const zoomExpression = `min(zoom+${zoomPerFrame.toFixed(6)},1.3)`;

    // Use rotate filter BEFORE zoompan for better compatibility
    const rotateAngle = `${rotationPerFrame}*n`; // n = frame number

    console.log(`🌀 Spin-zoom (${duration.toFixed(1)}s): ${totalRotation}° rotation, zoom ${zoomPerFrame.toFixed(6)}/frame`);

    ffmpeg(photoPath)
      .inputOptions(['-loop', '1', '-framerate', '30', '-t', duration.toString()])
      .complexFilter([
        // First scale, then rotate, then zoompan
        '[0:v]scale=1080:1920,setsar=1:1[scaled]',
        `[scaled]rotate=${rotateAngle}*PI/180:c=black:ow=1080:oh=1920[rotated]`,
        `[rotated]zoompan=z='${zoomExpression}':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps}[v]`
      ])
      .map('[v]')
      .videoCodec('libx264')
      .outputOptions([
        '-preset', quality === 'premium' ? 'slow' : 'superfast',
        '-crf', quality === 'premium' ? '20' : '26',
        '-pix_fmt', 'yuv420p',
        '-t', duration.toString()
      ])
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('Spin-zoom error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * 📳 SHAKE-ZOOM: Camera shake effect while zooming - ENERGETIC!
 */
function createShakeZoomClip(
  photoPath: string,
  outputPath: string,
  effect: CreativeEffect,
  duration: number,
  quality?: 'fast' | 'premium'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fps = 30;
    const frames = duration * fps;
    const intensity = effect.intensity || 5;
    const kenBurns = effect.kenBurns || { zoom: 'in', pan: 'none' };

    // Shake: Use frame-based oscillation with crop filter (supports sin/cos!)
    // Shake frequency: ~10 times per duration
    const shakeFreq = 10;
    const shakeCycles = shakeFreq * 2 * Math.PI / frames;

    // Dynamic zoom - completes over full clip duration
    const zoomChange = 0.3;
    const zoomPerFrame = zoomChange / frames;

    // Pre-zoom to larger size to allow crop with shake offset
    const preZoom = 1.15; // 15% larger to accommodate shake movement
    const zoomExpression = kenBurns.zoom === 'in'
      ? `min(zoom+${zoomPerFrame.toFixed(6)},1.3)*${preZoom}`
      : `max(1.3-on*${zoomPerFrame.toFixed(6)},1.0)*${preZoom}`;

    // Calculate output size for zoom (1080x1920 * 1.15 = ~1244x2208)
    const zoomWidth = Math.ceil(1080 * preZoom);
    const zoomHeight = Math.ceil(1920 * preZoom);

    // Center offset for crop
    const centerX = Math.floor((zoomWidth - 1080) / 2);
    const centerY = Math.floor((zoomHeight - 1920) / 2);

    // Shake offset expressions (crop filter supports sin/cos)
    const shakeXExpr = `${centerX}+${intensity}*sin(${shakeCycles}*n)`;
    const shakeYExpr = `${centerY}+${intensity}*cos(${shakeCycles}*n*1.2)`;

    console.log(`📳 Shake-zoom (${duration.toFixed(1)}s): ${shakeFreq} shakes, zoom ${zoomPerFrame.toFixed(6)}/frame`);

    ffmpeg(photoPath)
      .inputOptions(['-loop', '1', '-framerate', '30', '-t', duration.toString()])
      .complexFilter([
        // Stage 1: Scale and zoom (larger output to allow shake crop)
        `[0:v]scale=${zoomWidth}:${zoomHeight},setsar=1:1[scaled]`,
        `[scaled]zoompan=z='${zoomExpression}':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${zoomWidth}x${zoomHeight}:fps=${fps}[zoomed]`,
        // Stage 2: Apply shake using crop with dynamic sin/cos offset
        `[zoomed]crop=1080:1920:${shakeXExpr}:${shakeYExpr}[v]`
      ])
      .map('[v]')
      .videoCodec('libx264')
      .outputOptions([
        '-preset', quality === 'premium' ? 'slow' : 'superfast',
        '-crf', quality === 'premium' ? '20' : '26',
        '-pix_fmt', 'yuv420p',
        '-t', duration.toString()
      ])
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('Shake-zoom error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * 📸 POLAROID: Polaroid frame with slight rotation - STYLISH!
 */
function createPolaroidClip(
  photoPath: string,
  outputPath: string,
  effect: CreativeEffect,
  duration: number,
  quality?: 'fast' | 'premium'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fps = 30;
    const frames = duration * fps;
    const intensity = effect.intensity || 4;

    // Wobble rotation: -intensity° to +intensity° using frame number
    const wobbleCycles = 2 * Math.PI / frames; // Complete 1 wobble cycle
    const rotationExpression = `${intensity}*PI/180*sin(${wobbleCycles}*n)`;

    // Dynamic gentle zoom (1.0 to 1.25 = 0.25 change)
    const zoomChange = 0.25;
    const zoomPerFrame = zoomChange / frames;
    const zoomExpression = `min(zoom+${zoomPerFrame.toFixed(6)},1.25)`;

    console.log(`📸 Polaroid (${duration.toFixed(1)}s): ±${intensity}° wobble, zoom ${zoomPerFrame.toFixed(6)}/frame`);

    ffmpeg(photoPath)
      .inputOptions(['-loop', '1', '-framerate', '30', '-t', duration.toString()])
      .complexFilter([
        // Add white border (polaroid style), then zoom, then rotate
        '[0:v]scale=880:880,pad=1080:1280:100:100:white,setsar=1:1[padded]',
        `[padded]zoompan=z='${zoomExpression}':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps}[zoomed]`,
        `[zoomed]rotate=${rotationExpression}:c=black:ow=1080:oh=1920[v]`
      ])
      .map('[v]')
      .videoCodec('libx264')
      .outputOptions([
        '-preset', quality === 'premium' ? 'slow' : 'superfast',
        '-crf', quality === 'premium' ? '20' : '26',
        '-pix_fmt', 'yuv420p',
        '-t', duration.toString()
      ])
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('Polaroid error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * 🎾 BOUNCE-REVEAL: Elastic bounce entrance - PLAYFUL!
 */
function createBounceRevealClip(
  photoPath: string,
  outputPath: string,
  effect: CreativeEffect,
  duration: number,
  quality?: 'fast' | 'premium'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fps = 30;
    const frames = duration * fps;
    const intensity = effect.intensity || 7;
    const kenBurns = effect.kenBurns || { zoom: 'in', pan: 'left-to-right' };

    // Bounce: Elastic ease-out using exponential decay (frame-based)
    // Start big, bounce down to normal using frame number 'n'
    const bounceExpression = `1.5-0.5*exp(-${intensity}*n/${frames})*abs(sin(${intensity}*2*PI*n/${frames}))`;

    // Dynamic Ken Burns pan
    const panDistance = 160;
    const panSpeed = panDistance / frames;
    const startOffset = panDistance / 2;

    let xExpression = 'iw/2-(iw/zoom/2)';
    if (kenBurns.pan === 'left-to-right') {
      xExpression = `iw/2-(iw/zoom/2)-${startOffset}+on*${panSpeed.toFixed(3)}`;
    } else if (kenBurns.pan === 'right-to-left') {
      xExpression = `iw/2-(iw/zoom/2)+${startOffset}-on*${panSpeed.toFixed(3)}`;
    }

    console.log(`🎾 Bounce-reveal (${duration.toFixed(1)}s): elastic bounce with intensity ${intensity}`);

    ffmpeg(photoPath)
      .inputOptions(['-loop', '1', '-framerate', '30', '-t', duration.toString()])
      .complexFilter([
        `[0:v]scale=1080:1920,setsar=1:1,zoompan=z='${bounceExpression}':d=${frames}:x='${xExpression}':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps}[v]`
      ])
      .map('[v]')
      .videoCodec('libx264')
      .outputOptions([
        '-preset', quality === 'premium' ? 'slow' : 'superfast',
        '-crf', quality === 'premium' ? '20' : '26',
        '-pix_fmt', 'yuv420p',
        '-t', duration.toString()
      ])
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('Bounce-reveal error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * 🏃 SLIDE-REVEAL: Slide in from side with momentum - DYNAMIC!
 */
function createSlideRevealClip(
  photoPath: string,
  outputPath: string,
  effect: CreativeEffect,
  duration: number,
  quality?: 'fast' | 'premium'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fps = 30;
    const frames = duration * fps;
    const intensity = effect.intensity || 8;
    const kenBurns = effect.kenBurns || { zoom: 'out', pan: 'right-to-left' };

    // Slide from right to center with deceleration (frame-based)
    // Uses frame number 'n' instead of time 't'
    const slideExpression = `iw/2-(iw/zoom/2)+${intensity*100}*(1-min(n/${frames},1))^2`;

    // Dynamic zoom - completes over full clip duration
    const zoomChange = 0.3;
    const zoomPerFrame = zoomChange / frames;
    const zoomExpression = kenBurns.zoom === 'in'
      ? `min(zoom+${zoomPerFrame.toFixed(6)},1.3)`
      : `max(1.3-on*${zoomPerFrame.toFixed(6)},1.0)`;

    console.log(`🏃 Slide-reveal (${duration.toFixed(1)}s): intensity ${intensity}, zoom ${zoomPerFrame.toFixed(6)}/frame`);

    ffmpeg(photoPath)
      .inputOptions(['-loop', '1', '-framerate', '30', '-t', duration.toString()])
      .complexFilter([
        `[0:v]scale=1080:1920,setsar=1:1,zoompan=z='${zoomExpression}':d=${frames}:x='${slideExpression}':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps}[v]`
      ])
      .map('[v]')
      .videoCodec('libx264')
      .outputOptions([
        '-preset', quality === 'premium' ? 'slow' : 'superfast',
        '-crf', quality === 'premium' ? '20' : '26',
        '-pix_fmt', 'yuv420p',
        '-t', duration.toString()
      ])
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('Slide-reveal error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * ⚡ GLITCH: Digital glitch effect - GEN Z VIBES!
 */
function createGlitchClip(
  photoPath: string,
  outputPath: string,
  effect: CreativeEffect,
  duration: number,
  quality?: 'fast' | 'premium'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fps = 30;
    const frames = duration * fps;
    const intensity = effect.intensity || 7;

    // Dynamic zoom
    const zoomChange = 0.3;
    const zoomPerFrame = zoomChange / frames;
    const zoomExpression = `min(zoom+${zoomPerFrame.toFixed(6)},1.3)`;

    console.log(`⚡ Glitch (${duration.toFixed(1)}s): DRAMATIC RGB shift + noise`);

    ffmpeg(photoPath)
      .inputOptions(['-loop', '1', '-framerate', '30', '-t', duration.toString()])
      .complexFilter([
        // Zoom first
        `[0:v]scale=1080:1920,setsar=1:1,zoompan=z='${zoomExpression}':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps}[zoomed]`,
        // DRAMATIC glitch: shift red/blue channels + heavy noise + contrast
        `[zoomed]split=2[base][glitch]`,
        `[glitch]hue=s=0:h=120,eq=contrast=2.0[shifted]`,
        `[base][shifted]blend=all_mode=screen:all_opacity=0.3,noise=alls=15:allf=t+u,eq=saturation=1.5:contrast=1.3[v]`
      ])
      .map('[v]')
      .videoCodec('libx264')
      .outputOptions([
        '-preset', quality === 'premium' ? 'slow' : 'superfast',
        '-crf', quality === 'premium' ? '20' : '26',
        '-pix_fmt', 'yuv420p',
        '-t', duration.toString()
      ])
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('Glitch error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * 📼 VHS-RETRO: Vintage camera look - NOSTALGIC!
 */
function createVHSRetroClip(
  photoPath: string,
  outputPath: string,
  effect: CreativeEffect,
  duration: number,
  quality?: 'fast' | 'premium'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fps = 30;
    const frames = duration * fps;
    const kenBurns = effect.kenBurns || { zoom: 'in', pan: 'bottom-to-top' };

    // Dynamic zoom/pan
    const zoomChange = 0.3;
    const zoomPerFrame = zoomChange / frames;
    const zoomExpression = kenBurns.zoom === 'in'
      ? `min(zoom+${zoomPerFrame.toFixed(6)},1.3)`
      : `max(1.3-on*${zoomPerFrame.toFixed(6)},1.0)`;

    const panSpeed = 120 / frames;
    const panOffset = 60;
    let yExpression = 'ih/2-(ih/zoom/2)';
    if (kenBurns.pan === 'bottom-to-top') {
      yExpression = `ih/2-(ih/zoom/2)+${panOffset}-on*${panSpeed.toFixed(3)}`;
    }

    console.log(`📼 VHS-Retro (${duration.toFixed(1)}s): DRAMATIC vintage VHS`);

    ffmpeg(photoPath)
      .inputOptions(['-loop', '1', '-framerate', '30', '-t', duration.toString()])
      .complexFilter([
        // Zoom first
        `[0:v]scale=1080:1920,setsar=1:1,zoompan=z='${zoomExpression}':d=${frames}:x='iw/2-(iw/zoom/2)':y='${yExpression}':s=1080x1920:fps=${fps}[zoomed]`,
        // DRAMATIC VHS: low saturation, purple/magenta tint, heavy grain, blur
        `[zoomed]hue=s=0.5:h=-15,eq=saturation=0.7:gamma=1.2:contrast=0.9,noise=alls=12:allf=t+u,boxblur=2:1[v]`
      ])
      .map('[v]')
      .videoCodec('libx264')
      .outputOptions([
        '-preset', quality === 'premium' ? 'slow' : 'superfast',
        '-crf', quality === 'premium' ? '20' : '26',
        '-pix_fmt', 'yuv420p',
        '-t', duration.toString()
      ])
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('VHS-retro error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * 🎭 3D-TILT: Perspective tilt shift - MODERN!
 */
function create3DTiltClip(
  photoPath: string,
  outputPath: string,
  effect: CreativeEffect,
  duration: number,
  quality?: 'fast' | 'premium'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fps = 30;
    const frames = duration * fps;
    const intensity = effect.intensity || 5;
    const kenBurns = effect.kenBurns || { zoom: 'out', pan: 'top-to-bottom' };

    // Dynamic zoom
    const zoomChange = 0.3;
    const zoomPerFrame = zoomChange / frames;
    const zoomExpression = kenBurns.zoom === 'in'
      ? `min(zoom+${zoomPerFrame.toFixed(6)},1.3)`
      : `max(1.3-on*${zoomPerFrame.toFixed(6)},1.0)`;

    // 3D perspective: gradual Y-axis rotation
    const tiltDegrees = intensity * 2; // Max tilt angle
    const tiltPerFrame = tiltDegrees / frames;
    const perspectiveExpression = `perspective=x0=0:y0=${tiltPerFrame}*n:x1=W:y1=0:x2=0:y2=H:x3=W:y3=H-${tiltPerFrame}*n`;

    console.log(`🎭 3D-Tilt (${duration.toFixed(1)}s): ${tiltDegrees}° perspective shift`);

    ffmpeg(photoPath)
      .inputOptions(['-loop', '1', '-framerate', '30', '-t', duration.toString()])
      .complexFilter([
        `[0:v]scale=1200:2112,setsar=1:1[scaled]`,
        `[scaled]zoompan=z='${zoomExpression}':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1200x2112:fps=${fps}[zoomed]`,
        `[zoomed]crop=1080:1920:60:96[v]`
      ])
      .map('[v]')
      .videoCodec('libx264')
      .outputOptions([
        '-preset', quality === 'premium' ? 'slow' : 'superfast',
        '-crf', quality === 'premium' ? '20' : '26',
        '-pix_fmt', 'yuv420p',
        '-t', duration.toString()
      ])
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('3D-tilt error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * 💎 NEON-GLOW: Cyberpunk neon effect - FUTURISTIC!
 */
function createNeonGlowClip(
  photoPath: string,
  outputPath: string,
  effect: CreativeEffect,
  duration: number,
  quality?: 'fast' | 'premium'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fps = 30;
    const frames = duration * fps;
    const kenBurns = effect.kenBurns || { zoom: 'in', pan: 'left-to-right' };

    // Dynamic zoom/pan
    const zoomChange = 0.3;
    const zoomPerFrame = zoomChange / frames;
    const zoomExpression = kenBurns.zoom === 'in'
      ? `min(zoom+${zoomPerFrame.toFixed(6)},1.3)`
      : `max(1.3-on*${zoomPerFrame.toFixed(6)},1.0)`;

    const panSpeed = 160 / frames;
    const panOffset = 80;
    let xExpression = 'iw/2-(iw/zoom/2)';
    if (kenBurns.pan === 'left-to-right') {
      xExpression = `iw/2-(iw/zoom/2)-${panOffset}+on*${panSpeed.toFixed(3)}`;
    }

    console.log(`💎 Neon-Glow (${duration.toFixed(1)}s): DRAMATIC cyberpunk neon`);

    ffmpeg(photoPath)
      .inputOptions(['-loop', '1', '-framerate', '30', '-t', duration.toString()])
      .complexFilter([
        `[0:v]scale=1080:1920,setsar=1:1,zoompan=z='${zoomExpression}':d=${frames}:x='${xExpression}':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps}[zoomed]`,
        // DRAMATIC neon: extreme saturation, cyan/magenta shift, unsharp glow
        `[zoomed]eq=saturation=2.5:contrast=1.5:brightness=0.05,hue=s=1.3,unsharp=7:7:3.0[v]`
      ])
      .map('[v]')
      .videoCodec('libx264')
      .outputOptions([
        '-preset', quality === 'premium' ? 'slow' : 'superfast',
        '-crf', quality === 'premium' ? '20' : '26',
        '-pix_fmt', 'yuv420p',
        '-t', duration.toString()
      ])
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('Neon-glow error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * 🌈 CHROMATIC: RGB split aberration - TRENDY!
 */
function createChromaticClip(
  photoPath: string,
  outputPath: string,
  effect: CreativeEffect,
  duration: number,
  quality?: 'fast' | 'premium'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fps = 30;
    const frames = duration * fps;
    const kenBurns = effect.kenBurns || { zoom: 'out', pan: 'right-to-left' };

    // Dynamic zoom/pan
    const zoomChange = 0.3;
    const zoomPerFrame = zoomChange / frames;
    const zoomExpression = kenBurns.zoom === 'in'
      ? `min(zoom+${zoomPerFrame.toFixed(6)},1.3)`
      : `max(1.3-on*${zoomPerFrame.toFixed(6)},1.0)`;

    const panSpeed = 160 / frames;
    const panOffset = 80;
    let xExpression = 'iw/2-(iw/zoom/2)';
    if (kenBurns.pan === 'right-to-left') {
      xExpression = `iw/2-(iw/zoom/2)+${panOffset}-on*${panSpeed.toFixed(3)}`;
    }

    console.log(`🌈 Chromatic (${duration.toFixed(1)}s): DRAMATIC RGB split`);

    ffmpeg(photoPath)
      .inputOptions(['-loop', '1', '-framerate', '30', '-t', duration.toString()])
      .complexFilter([
        `[0:v]scale=1080:1920,setsar=1:1,zoompan=z='${zoomExpression}':d=${frames}:x='${xExpression}':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps}[zoomed]`,
        // DRAMATIC chromatic: purple/cyan color shift
        `[zoomed]split=2[base][shift]`,
        `[shift]hue=h=180:s=1.5[shifted]`,
        `[base][shifted]blend=all_mode=screen:all_opacity=0.4,eq=contrast=1.2[v]`
      ])
      .map('[v]')
      .videoCodec('libx264')
      .outputOptions([
        '-preset', quality === 'premium' ? 'slow' : 'superfast',
        '-crf', quality === 'premium' ? '20' : '26',
        '-pix_fmt', 'yuv420p',
        '-t', duration.toString()
      ])
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('Chromatic error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * 🎞️ FILM-BURN: Old film aesthetic - CINEMATIC!
 */
function createFilmBurnClip(
  photoPath: string,
  outputPath: string,
  effect: CreativeEffect,
  duration: number,
  quality?: 'fast' | 'premium'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fps = 30;
    const frames = duration * fps;
    const kenBurns = effect.kenBurns || { zoom: 'out', pan: 'top-to-bottom' };

    // Dynamic zoom/pan
    const zoomChange = 0.3;
    const zoomPerFrame = zoomChange / frames;
    const zoomExpression = kenBurns.zoom === 'in'
      ? `min(zoom+${zoomPerFrame.toFixed(6)},1.3)`
      : `max(1.3-on*${zoomPerFrame.toFixed(6)},1.0)`;

    const panSpeed = 120 / frames;
    const panOffset = 60;
    let yExpression = 'ih/2-(ih/zoom/2)';
    if (kenBurns.pan === 'top-to-bottom') {
      yExpression = `ih/2-(ih/zoom/2)-${panOffset}+on*${panSpeed.toFixed(3)}`;
    }

    console.log(`🎞️ Film-Burn (${duration.toFixed(1)}s): DRAMATIC sepia + grain`);

    ffmpeg(photoPath)
      .inputOptions(['-loop', '1', '-framerate', '30', '-t', duration.toString()])
      .complexFilter([
        `[0:v]scale=1080:1920,setsar=1:1,zoompan=z='${zoomExpression}':d=${frames}:x='iw/2-(iw/zoom/2)':y='${yExpression}':s=1080x1920:fps=${fps}[zoomed]`,
        // DRAMATIC film burn: strong sepia, heavy grain, vignette, lower contrast
        `[zoomed]colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,eq=contrast=0.8:brightness=-0.05,noise=alls=18:allf=t+u,vignette=PI/3[v]`
      ])
      .map('[v]')
      .videoCodec('libx264')
      .outputOptions([
        '-preset', quality === 'premium' ? 'slow' : 'superfast',
        '-crf', quality === 'premium' ? '20' : '26',
        '-pix_fmt', 'yuv420p',
        '-t', duration.toString()
      ])
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('Film-burn error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * ⚡ ZOOM-BLUR: Speed ramp effect - DYNAMIC!
 */
function createZoomBlurClip(
  photoPath: string,
  outputPath: string,
  effect: CreativeEffect,
  duration: number,
  quality?: 'fast' | 'premium'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fps = 30;
    const frames = duration * fps;
    const intensity = effect.intensity || 8;

    // Aggressive zoom with motion blur
    const zoomChange = 0.5; // More dramatic zoom
    const zoomPerFrame = zoomChange / frames;
    const zoomExpression = `min(zoom+${zoomPerFrame.toFixed(6)},1.5)`;

    console.log(`⚡ Zoom-Blur (${duration.toFixed(1)}s): speed ramp intensity ${intensity}`);

    ffmpeg(photoPath)
      .inputOptions(['-loop', '1', '-framerate', '30', '-t', duration.toString()])
      .complexFilter([
        `[0:v]scale=1080:1920,setsar=1:1,zoompan=z='${zoomExpression}':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps}[zoomed]`,
        // Add radial blur for speed effect
        `[zoomed]boxblur=lr=2:lp=1,unsharp=3:3:1.5[v]`
      ])
      .map('[v]')
      .videoCodec('libx264')
      .outputOptions([
        '-preset', quality === 'premium' ? 'slow' : 'superfast',
        '-crf', quality === 'premium' ? '20' : '26',
        '-pix_fmt', 'yuv420p',
        '-t', duration.toString()
      ])
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('Zoom-blur error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * ⚫ BLACK-WHITE: High contrast B&W - DRAMATIC!
 */
function createBlackWhiteClip(
  photoPath: string,
  outputPath: string,
  effect: CreativeEffect,
  duration: number,
  quality?: 'fast' | 'premium'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fps = 30;
    const frames = duration * fps;
    const kenBurns = effect.kenBurns || { zoom: 'out', pan: 'left-to-right' };

    // Dynamic zoom/pan
    const zoomChange = 0.3;
    const zoomPerFrame = zoomChange / frames;
    const zoomExpression = kenBurns.zoom === 'in'
      ? `min(zoom+${zoomPerFrame.toFixed(6)},1.3)`
      : `max(1.3-on*${zoomPerFrame.toFixed(6)},1.0)`;

    const panSpeed = 160 / frames;
    const panOffset = 80;
    let xExpression = 'iw/2-(iw/zoom/2)';
    if (kenBurns.pan === 'left-to-right') {
      xExpression = `iw/2-(iw/zoom/2)-${panOffset}+on*${panSpeed.toFixed(3)}`;
    }

    console.log(`⚫ Black-White (${duration.toFixed(1)}s): DRAMATIC high contrast B&W`);

    ffmpeg(photoPath)
      .inputOptions(['-loop', '1', '-framerate', '30', '-t', duration.toString()])
      .complexFilter([
        `[0:v]scale=1080:1920,setsar=1:1,zoompan=z='${zoomExpression}':d=${frames}:x='${xExpression}':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps}[zoomed]`,
        // DRAMATIC B&W: desaturate completely, boost contrast heavily
        `[zoomed]hue=s=0,eq=contrast=1.6:brightness=0.05,unsharp=3:3:1.0[v]`
      ])
      .map('[v]')
      .videoCodec('libx264')
      .outputOptions([
        '-preset', quality === 'premium' ? 'slow' : 'superfast',
        '-crf', quality === 'premium' ? '20' : '26',
        '-pix_fmt', 'yuv420p',
        '-t', duration.toString()
      ])
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('Black-white error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * 🌸 VINTAGE-FADE: Washed out pastel - DREAMY!
 */
function createVintageFadeClip(
  photoPath: string,
  outputPath: string,
  effect: CreativeEffect,
  duration: number,
  quality?: 'fast' | 'premium'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const fps = 30;
    const frames = duration * fps;
    const kenBurns = effect.kenBurns || { zoom: 'in', pan: 'none' };

    // Dynamic zoom
    const zoomChange = 0.3;
    const zoomPerFrame = zoomChange / frames;
    const zoomExpression = kenBurns.zoom === 'in'
      ? `min(zoom+${zoomPerFrame.toFixed(6)},1.3)`
      : `max(1.3-on*${zoomPerFrame.toFixed(6)},1.0)`;

    console.log(`🌸 Vintage-Fade (${duration.toFixed(1)}s): DRAMATIC washed pastel`);

    ffmpeg(photoPath)
      .inputOptions(['-loop', '1', '-framerate', '30', '-t', duration.toString()])
      .complexFilter([
        `[0:v]scale=1080:1920,setsar=1:1,zoompan=z='${zoomExpression}':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps}[zoomed]`,
        // DRAMATIC vintage: washed out, lower saturation, soft focus, brightness up
        `[zoomed]eq=saturation=0.6:contrast=0.85:brightness=0.15:gamma=1.15,boxblur=1:1[v]`
      ])
      .map('[v]')
      .videoCodec('libx264')
      .outputOptions([
        '-preset', quality === 'premium' ? 'slow' : 'superfast',
        '-crf', quality === 'premium' ? '20' : '26',
        '-pix_fmt', 'yuv420p',
        '-t', duration.toString()
      ])
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('Vintage-fade error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * Add text overlays to video clips
 */
async function addTextOverlays(
  clipPaths: string[],
  textOverlays: TextOverlay[],
  tempDir: string
): Promise<string> {
  if (textOverlays.length === 0) {
    // No overlays, concatenate clips directly
    return concatenateClips(clipPaths, tempDir);
  }

  // First, concatenate all clips
  const baseVideoPath = await concatenateClips(clipPaths, tempDir);

  // Generate overlay images
  const overlayPaths: Array<{ path: string; overlay: TextOverlay }> = [];
  for (let i = 0; i < textOverlays.length; i++) {
    const overlay = textOverlays[i];
    const overlayPath = path.join(tempDir, `overlay-${i}.png`);
    await generateTextOverlayImage(overlay, overlayPath);
    overlayPaths.push({ path: overlayPath, overlay });
  }

  // Apply overlays to video
  const outputPath = path.join(tempDir, 'video-with-text.mp4');
  await applyOverlaysToVideo(baseVideoPath, overlayPaths, outputPath);

  return outputPath;
}

/**
 * Concatenate video clips with varied transitions
 */
function concatenateClips(clipPaths: string[], tempDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(tempDir, 'concatenated.mp4');
    const transitionDuration = 0.3; // FAST transitions - snappy and punchy!

    // Use dynamic clip duration if available, otherwise default to 1.8s
    const clipDuration = (clipPaths as any).clipDuration || 1.8;
    console.log(`🔗 Concatenating ${clipPaths.length} clips (${clipDuration.toFixed(1)}s each) with ${transitionDuration}s transitions`);

    if (clipPaths.length === 1) {
      // Single clip, no transitions needed
      fs.copyFile(clipPaths[0], outputPath).then(() => resolve(outputPath)).catch(reject);
      return;
    }

    // CREATIVE TRANSITIONS - Instagram/TikTok style!
    const transitions = [
      'fade',
      'wipeleft',
      'wiperight',
      'slideleft',
      'slideright',
      'circleopen',    // Cool circle reveal
      'circleclose',   // Circle collapse
      'hblur',         // Horizontal blur
      'radial',        // Radial transition
      'smoothleft',
      'smoothright',
      'dissolve',      // Dissolve effect
    ];

    // Build xfade filter chain
    const cmd = ffmpeg();
    clipPaths.forEach((clip) => cmd.input(clip));

    const filterChain: string[] = [];
    let previousOutput = '[0:v]';

    for (let i = 1; i < clipPaths.length; i++) {
      // Calculate offset based on the accumulated duration
      const offset = i * (clipDuration - transitionDuration);

      // Rotate through transitions for variety
      const transition = transitions[i % transitions.length];

      const currentOutput = i === clipPaths.length - 1 ? '[vout]' : `[v${i}]`;

      filterChain.push(
        `${previousOutput}[${i}:v]xfade=transition=${transition}:duration=${transitionDuration}:offset=${offset}${currentOutput}`
      );

      previousOutput = currentOutput;
    }

    cmd
      .complexFilter(filterChain)
      .map('[vout]')
      .videoCodec('libx264')
      .outputOptions(['-preset', 'superfast', '-crf', '26', '-pix_fmt', 'yuv420p'])
      .on('end', () => resolve(outputPath))
      .on('error', (err) => {
        console.error('Concat error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * Generate text overlay image using Canvas with text wrapping
 * Generate at 2x resolution for crisp quality
 */
async function generateTextOverlayImage(
  overlay: TextOverlay,
  outputPath: string
): Promise<void> {
  const width = 2160; // 2x resolution (1080 * 2)
  const height = 1000; // 2x resolution
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Set playful text style at 2x resolution
  let fontSize = 160; // Start with large font (2x of 80)
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Word wrap function at 2x resolution
  const maxWidth = 1900; // Leave padding on sides (2x of 950)
  const words = overlay.text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const testLine = currentLine + ' ' + words[i];
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  // If text is still too wide even after wrapping, reduce font size
  while (lines.some(line => ctx.measureText(line).width > maxWidth) && fontSize > 80) {
    fontSize -= 10; // Decrease in larger steps for 2x resolution
    ctx.font = `bold ${fontSize}px Arial`;

    // Re-wrap with new font size
    lines.length = 0;
    currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i];
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
  }

  // Draw each line
  const lineHeight = fontSize * 1.2;
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    const y = startY + (index * lineHeight);

    // Add thick black stroke (outline) for contrast at 2x resolution
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 20; // 2x of 10
    ctx.strokeText(line, width / 2, y);

    // Add bright white text fill
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(line, width / 2, y);
  });

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  await fs.writeFile(outputPath, buffer);

  console.log(`✍️ Generated ${lines.length}-line text overlay: "${overlay.text}" (font: ${fontSize}px)`);
}

/**
 * Apply text overlays to video at specific timestamps
 */
function applyOverlaysToVideo(
  videoPath: string,
  overlays: Array<{ path: string; overlay: TextOverlay }>,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(videoPath);

    // Add all overlay images as inputs
    overlays.forEach(({ path }) => cmd.input(path));

    // Build overlay filter chain
    const filterChain: string[] = [];
    let inputIndex = '[0:v]';

    overlays.forEach(({ overlay }, i) => {
      const overlayInput = `[${i + 1}:v]`;
      const outputIndex = i === overlays.length - 1 ? '[vout]' : `[ov${i}]`;
      const yPos = overlay.position === 'top' ? '150' : overlay.position === 'bottom' ? 'H-h-150' : '(H-h)/2';

      // First scale the overlay image, then apply it to video
      filterChain.push(
        `${overlayInput}scale=1080:-1[overlay${i}]`, // Scale overlay to fit video width
        `${inputIndex}[overlay${i}]overlay=x=(W-w)/2:y=${yPos}:enable='between(t,${overlay.startTime},${overlay.startTime + overlay.duration})'${outputIndex}`
      );

      inputIndex = outputIndex;
    });

    console.log('🎨 Text overlay filter:', filterChain);

    cmd
      .complexFilter(filterChain)
      .map('[vout]')
      .videoCodec('libx264')
      .outputOptions([
        '-preset', 'medium', // Better quality than superfast
        '-crf', '18', // Much higher quality (lower CRF = better quality)
        '-pix_fmt', 'yuv420p'
      ])
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('Text overlay error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * Assemble video with transitions (simplified, already done in concatenateClips)
 */
async function assembleVideoWithTransitions(
  videoPath: string,
  tempDir: string,
  quality?: 'fast' | 'premium'
): Promise<string> {
  // Transitions already applied in concatenateClips
  return videoPath;
}

/**
 * Add final audio track and watermark
 */
function finalizeVideo(
  videoPath: string,
  audioPath: string,
  tempDir: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(tempDir, 'final-reel.mp4');

    ffmpeg(videoPath)
      .input(audioPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioBitrate('192k')
      .outputOptions([
        '-preset', 'superfast', // Faster encoding
        '-crf', '26',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', // Enable streaming
        '-shortest', // End when shortest input ends (prevents repetition)
      ])
      .on('end', () => resolve(outputPath))
      .on('error', (err) => {
        console.error('Finalize video error:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * Generate thumbnail from video
 */
function generateThumbnail(videoPath: string, tempDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(tempDir, 'thumbnail.jpg');

    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:02'],
        filename: 'thumbnail.jpg',
        folder: tempDir,
        size: '1080x1920',
      })
      .on('end', () => resolve(outputPath))
      .on('error', reject);
  });
}

/**
 * Upload video to S3
 */
async function uploadVideoToS3(
  videoPath: string,
  childId: Types.ObjectId
): Promise<string> {
  const buffer = await fs.readFile(videoPath);

  return uploadToS3({
    buffer,
    fileName: `reel-${Date.now()}.mp4`,
    folder: `reels/${childId.toString()}`,
    contentType: 'video/mp4',
  });
}

/**
 * Get video duration in seconds
 */
function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}
