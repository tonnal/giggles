/**
 * Music Video Generator for "Dhun"
 * Creates a dynamic, fast-paced music video with cool transitions
 */

import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

const execPromise = promisify(exec);

interface VideoConfig {
  audioPath: string;
  mediaDirPath: string;
  titlePosterPath: string;
  outputPath: string;
  titleDuration: number; // seconds to show title
  fps: number;
  resolution: string;
}

const TRANSITIONS = [
  'fade',
  'fadeblack',
  'fadewhite',
  'distance',
  'wipeleft',
  'wiperight',
  'wipeup',
  'wipedown',
  'slideleft',
  'slideright',
  'slideup',
  'slidedown',
  'circlecrop',
  'rectcrop',
  'circleclose',
  'circleopen',
  'dissolve',
  'pixelize',
  'radial',
  'smoothleft',
  'smoothright',
  'smoothup',
  'smoothdown',
];

/**
 * Get all media files from directory (excluding title poster)
 */
async function getMediaFiles(dirPath: string, excludeFile: string): Promise<string[]> {
  const files = await fs.readdir(dirPath);

  const mediaFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    const isMedia = ['.jpg', '.jpeg', '.png', '.mp4', '.mov'].includes(ext);
    const notExcluded = file !== path.basename(excludeFile);
    const notHidden = !file.startsWith('.');
    return isMedia && notExcluded && notHidden;
  });

  // Shuffle for variety
  return mediaFiles
    .map(file => path.join(dirPath, file))
    .sort(() => Math.random() - 0.5);
}

/**
 * Get audio duration in seconds
 */
async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

/**
 * Check if file is a video
 */
function isVideo(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ['.mp4', '.mov', '.avi', '.mkv'].includes(ext);
}

/**
 * Create a single clip with zoom/pan effect
 */
async function createClip(
  inputPath: string,
  outputPath: string,
  duration: number,
  resolution: string,
  fps: number,
  effect: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'static'
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🎬 Creating clip: ${path.basename(inputPath)} (${duration.toFixed(2)}s, ${effect})`);

    const [width, height] = resolution.split('x').map(Number);

    let filterComplex: string;

    if (isVideo(inputPath)) {
      // For videos: trim, scale, and optionally add zoom/pan
      if (effect === 'zoom-in') {
        filterComplex = `[0:v]trim=duration=${duration},setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},zoompan=z='min(zoom+0.0015,1.5)':d=${duration * fps}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}[v]`;
      } else if (effect === 'zoom-out') {
        filterComplex = `[0:v]trim=duration=${duration},setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},zoompan=z='if(lte(zoom,1.0),1.5,max(1.0,zoom-0.0015))':d=${duration * fps}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}[v]`;
      } else {
        filterComplex = `[0:v]trim=duration=${duration},setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=${fps}[v]`;
      }
    } else {
      // For images: loop and add zoom/pan effects
      const frames = Math.ceil(duration * fps);

      if (effect === 'zoom-in') {
        filterComplex = `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},zoompan=z='min(zoom+0.002,1.3)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}[v]`;
      } else if (effect === 'zoom-out') {
        filterComplex = `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},zoompan=z='if(lte(zoom,1.0),1.3,max(1.0,zoom-0.002))':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}[v]`;
      } else if (effect === 'pan-left') {
        filterComplex = `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},zoompan=z=1.2:d=${frames}:x='iw/2-(iw/zoom/2)-${width * 0.1}*(on/${frames})':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}[v]`;
      } else if (effect === 'pan-right') {
        filterComplex = `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},zoompan=z=1.2:d=${frames}:x='iw/2-(iw/zoom/2)+${width * 0.1}*(on/${frames})':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}[v]`;
      } else {
        filterComplex = `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},fps=${fps}[v]`;
      }
    }

    const command = ffmpeg(inputPath);

    if (!isVideo(inputPath)) {
      command.inputOptions(['-loop', '1', '-t', duration.toString()]);
    }

    command
      .complexFilter(filterComplex)
      .outputOptions([
        '-map', '[v]',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
      ])
      .output(outputPath)
      .on('end', () => {
        console.log(`✅ Clip created: ${path.basename(outputPath)}`);
        resolve();
      })
      .on('error', (err) => {
        console.error(`❌ Error creating clip: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

/**
 * Concatenate all clips (simple concat, transitions handled in clip creation)
 */
async function concatenateClips(
  clipPaths: string[],
  outputPath: string,
  fps: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n🎬 Concatenating ${clipPaths.length} clips...`);

    // Create concat file
    const concatFilePath = path.join(path.dirname(outputPath), 'concat_list.txt');
    const concatContent = clipPaths.map(p => `file '${p}'`).join('\n');

    fs.writeFile(concatFilePath, concatContent)
      .then(() => {
        ffmpeg()
          .input(concatFilePath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .outputOptions([
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-pix_fmt', 'yuv420p',
            '-r', fps.toString(),
          ])
          .output(outputPath)
          .on('progress', (progress) => {
            if (progress.percent) {
              console.log(`🎬 Concatenating: ${Math.round(progress.percent)}%`);
            }
          })
          .on('end', async () => {
            console.log(`✅ Concatenation complete!`);
            // Clean up concat file
            await fs.unlink(concatFilePath).catch(() => {});
            resolve();
          })
          .on('error', async (err) => {
            console.error(`❌ Error concatenating: ${err.message}`);
            await fs.unlink(concatFilePath).catch(() => {});
            reject(err);
          })
          .run();
      })
      .catch(reject);
  });
}

/**
 * Add audio to video
 */
async function addAudioToVideo(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n🎵 Adding audio to video...`);

    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions([
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-strict', 'experimental',
        '-shortest', // Ensure video matches audio duration
      ])
      .output(outputPath)
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`🎵 Adding audio: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log(`✅ Audio added successfully!`);
        resolve();
      })
      .on('error', (err) => {
        console.error(`❌ Error adding audio: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

/**
 * Main function to generate music video
 */
export async function generateMusicVideo(config: VideoConfig): Promise<void> {
  try {
    console.log('\n🎬 Starting Music Video Generation for "Dhun" 🎵\n');
    console.log('========================================\n');

    const {
      audioPath,
      mediaDirPath,
      titlePosterPath,
      outputPath,
      titleDuration,
      fps,
      resolution,
    } = config;

    // Step 1: Get audio duration
    console.log('📊 Analyzing audio...');
    const audioDuration = await getAudioDuration(audioPath);
    console.log(`🎵 Audio duration: ${audioDuration.toFixed(2)}s (${Math.floor(audioDuration / 60)}:${Math.floor(audioDuration % 60).toString().padStart(2, '0')})`);

    // Step 2: Get media files
    console.log('\n📁 Gathering media files...');
    const mediaFiles = await getMediaFiles(mediaDirPath, titlePosterPath);
    console.log(`📸 Found ${mediaFiles.length} media files`);

    // Step 3: Calculate clip durations
    const remainingDuration = audioDuration - titleDuration;
    const clipDuration = remainingDuration / mediaFiles.length;

    console.log(`\n⏱️  Video structure:`);
    console.log(`   - Title: ${titleDuration}s`);
    console.log(`   - ${mediaFiles.length} clips at ${clipDuration.toFixed(2)}s each`);
    console.log(`   - Total: ${audioDuration.toFixed(2)}s\n`);

    // Step 4: Create temp directory for clips
    const tempDir = path.join(path.dirname(outputPath), 'temp_clips');
    await fs.mkdir(tempDir, { recursive: true });

    const clipPaths: string[] = [];

    // Step 5: Create title clip
    console.log('🎬 Creating title clip...');
    const titleClipPath = path.join(tempDir, 'clip_000_title.mp4');
    await createClip(titlePosterPath, titleClipPath, titleDuration, resolution, fps, 'zoom-in');
    clipPaths.push(titleClipPath);

    // Step 6: Create clips for each media file
    const effects: ('zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'static')[] = [
      'zoom-in',
      'zoom-out',
      'pan-left',
      'pan-right',
      'static',
    ];

    for (let i = 0; i < mediaFiles.length; i++) {
      const effect = effects[i % effects.length]; // Rotate through effects
      const clipPath = path.join(tempDir, `clip_${(i + 1).toString().padStart(3, '0')}.mp4`);

      await createClip(mediaFiles[i], clipPath, clipDuration, resolution, fps, effect);
      clipPaths.push(clipPath);
    }

    // Step 7: Concatenate all clips
    const videoWithoutAudio = path.join(tempDir, 'video_no_audio.mp4');
    await concatenateClips(clipPaths, videoWithoutAudio, fps);

    // Step 8: Add audio
    await addAudioToVideo(videoWithoutAudio, audioPath, outputPath);

    // Step 9: Cleanup temp files
    console.log('\n🧹 Cleaning up temporary files...');
    await fs.rm(tempDir, { recursive: true, force: true });

    console.log('\n✅ Music video generation complete!');
    console.log(`📹 Output: ${outputPath}\n`);
    console.log('========================================\n');
  } catch (error: any) {
    console.error('\n❌ Error generating music video:', error.message);
    throw error;
  }
}

// Auto-run the video generation
const config: VideoConfig = {
  audioPath: '/Users/aryanjain/Desktop/Giggles/backend/assets/my_music/Dhun.mp3',
  mediaDirPath: '/Users/aryanjain/Desktop/second-anniversary',
  titlePosterPath: '/Users/aryanjain/Desktop/second-anniversary/dhun_title_poster.PNG',
  outputPath: '/Users/aryanjain/Desktop/Dhun_Music_Video.mp4',
  titleDuration: 5, // Show title for 5 seconds
  fps: 30,
  resolution: '1920x1080',
};

generateMusicVideo(config)
  .then(() => {
    console.log('🎉 Done! Enjoy your music video! 🎵');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
