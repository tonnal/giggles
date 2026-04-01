/**
 * Beautiful Music Video Generator with Aesthetic Backgrounds & Transitions
 */

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';

interface VideoConfig {
  audioPath: string;
  mediaDirPath: string;
  titlePosterPath: string;
  outputPath: string;
  titleDuration: number;
  fps: number;
  resolution: string;
}

/**
 * Get all media files, separated by type
 */
async function getMediaFilesSeparated(dirPath: string, excludeFile: string): Promise<{ videos: string[]; photos: string[] }> {
  const files = await fs.readdir(dirPath);
  const videos: string[] = [];
  const photos: string[] = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const filePath = path.join(dirPath, file);
    const notExcluded = file !== path.basename(excludeFile);
    const notHidden = !file.startsWith('.');

    if (!notExcluded || !notHidden) continue;

    if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
      videos.push(filePath);
    } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      photos.push(filePath);
    }
  }

  // Shuffle both arrays
  videos.sort(() => Math.random() - 0.5);
  photos.sort(() => Math.random() - 0.5);

  return { videos, photos };
}

/**
 * Interleave videos and photos for alternating pattern
 */
function interleaveMediaFiles(videos: string[], photos: string[]): string[] {
  const result: string[] = [];
  const maxLength = Math.max(videos.length, photos.length);

  for (let i = 0; i < maxLength; i++) {
    if (i < videos.length) result.push(videos[i]);
    if (i < photos.length) result.push(photos[i]);
  }

  return result;
}

/**
 * Get audio duration
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
 * Create beautiful clip with blurred background + polaroid frame
 */
async function createBeautifulClip(
  inputPath: string,
  outputPath: string,
  duration: number,
  resolution: string,
  fps: number,
  index: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🎬 [${index + 1}] ${path.basename(inputPath)} (${duration.toFixed(1)}s)`);

    const [width, height] = resolution.split('x').map(Number);
    const fadeDuration = 0.2; // Quick fade

    // BEAUTIFUL FILTER:
    // 1. Create blurred background (zoomed and blurred version of same image)
    // 2. Overlay properly-sized content on top
    // 3. Add subtle white polaroid-style border
    // 4. Add fade in/out

    let filterComplex: string;

    if (isVideo(inputPath)) {
      // For videos
      filterComplex = `
        [0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},gblur=sigma=20[bg];
        [0:v]scale=${width - 40}:${height - 40}:force_original_aspect_ratio=decrease,pad=${width - 40}:${height - 40}:(ow-iw)/2:(oh-ih)/2:white[content];
        [bg][content]overlay=(W-w)/2:(H-h)/2,drawbox=x=10:y=10:w=${width - 20}:h=${height - 20}:color=white@0.15:t=10,fade=t=in:st=0:d=${fadeDuration},fade=t=out:st=${duration - fadeDuration}:d=${fadeDuration},fps=${fps}[v]
      `.replace(/\s+/g, '');
    } else {
      // For images
      filterComplex = `
        [0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},gblur=sigma=20[bg];
        [0:v]scale=${width - 40}:${height - 40}:force_original_aspect_ratio=decrease,pad=${width - 40}:${height - 40}:(ow-iw)/2:(oh-ih)/2:white[content];
        [bg][content]overlay=(W-w)/2:(H-h)/2,drawbox=x=10:y=10:w=${width - 20}:h=${height - 20}:color=white@0.15:t=10,fade=t=in:st=0:d=${fadeDuration},fade=t=out:st=${duration - fadeDuration}:d=${fadeDuration},fps=${fps}[v]
      `.replace(/\s+/g, '');
    }

    const command = ffmpeg(inputPath);

    if (!isVideo(inputPath)) {
      command.inputOptions(['-loop', '1', '-t', duration.toString()]);
    } else {
      command.inputOptions(['-t', duration.toString()]);
    }

    command
      .complexFilter(filterComplex)
      .outputOptions([
        '-map', '[v]',
        '-c:v', 'libx264',
        '-preset', 'faster',
        '-crf', '23', // Better quality
        '-pix_fmt', 'yuv420p',
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });
}

/**
 * Concatenate clips using concat demuxer (simple and reliable)
 */
async function concatenateClips(
  clipPaths: string[],
  outputPath: string,
  fps: number
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    console.log(`\n🎬 Concatenating ${clipPaths.length} clips...`);

    const concatFilePath = path.join(path.dirname(outputPath), 'concat_list.txt');
    const concatContent = clipPaths.map(p => `file '${p}'`).join('\n');

    await fs.writeFile(concatFilePath, concatContent);

    ffmpeg()
      .input(concatFilePath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions([
        '-c:v', 'libx264',
        '-preset', 'faster',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-r', fps.toString(),
      ])
      .output(outputPath)
      .on('progress', (progress) => {
        if (progress.percent) {
          process.stdout.write(`\r🎬 Concatenating: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', async () => {
        console.log('\n✅ Concatenation complete!');
        await fs.unlink(concatFilePath).catch(() => {});
        resolve();
      })
      .on('error', async (err) => {
        await fs.unlink(concatFilePath).catch(() => {});
        reject(err);
      })
      .run();
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
    console.log(`\n🎵 Adding audio...`);

    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions([
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-strict', 'experimental',
        '-shortest',
      ])
      .output(outputPath)
      .on('progress', (progress) => {
        if (progress.percent) {
          process.stdout.write(`\r🎵 Adding audio: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('\n✅ Audio added!');
        resolve();
      })
      .on('error', reject)
      .run();
  });
}

/**
 * Main function
 */
async function generateBeautifulMusicVideo(config: VideoConfig): Promise<void> {
  try {
    console.log('\n🎨 Beautiful Music Video Generator for "Dhun" 🎵\n');
    console.log('==================================================\n');

    const {
      audioPath,
      mediaDirPath,
      titlePosterPath,
      outputPath,
      titleDuration,
      fps,
      resolution,
    } = config;

    // Get audio duration
    console.log('📊 Analyzing audio...');
    const audioDuration = await getAudioDuration(audioPath);
    const minutes = Math.floor(audioDuration / 60);
    const seconds = Math.floor(audioDuration % 60);
    console.log(`🎵 Duration: ${minutes}:${seconds.toString().padStart(2, '0')} (${audioDuration.toFixed(1)}s)\n`);

    // Get media files separated
    console.log('📁 Gathering media...');
    const { videos, photos } = await getMediaFilesSeparated(mediaDirPath, titlePosterPath);
    console.log(`🎥 Found ${videos.length} videos`);
    console.log(`📸 Found ${photos.length} photos`);

    // Interleave for alternating pattern
    const mediaFiles = interleaveMediaFiles(videos, photos);
    console.log(`✨ Alternating pattern: ${mediaFiles.length} total clips\n`);

    // Calculate clip durations
    const remainingDuration = audioDuration - titleDuration;
    const clipDuration = remainingDuration / mediaFiles.length;
    const transitionDuration = 0.4; // 400ms transitions (snappy but smooth)

    console.log(`⏱️  Structure:`);
    console.log(`   Title: ${titleDuration}s`);
    console.log(`   ${mediaFiles.length} clips × ${clipDuration.toFixed(1)}s`);
    console.log(`   Smooth fade transitions`);
    console.log(`   Total: ${audioDuration.toFixed(1)}s\n`);

    // Create temp directory
    const tempDir = path.join(path.dirname(outputPath), 'temp_clips_beautiful');
    await fs.mkdir(tempDir, { recursive: true });

    const clipPaths: string[] = [];

    // Create title clip
    console.log('🎬 Creating clips:\n');
    const titleClipPath = path.join(tempDir, 'clip_000.mp4');
    await createBeautifulClip(titlePosterPath, titleClipPath, titleDuration, resolution, fps, -1);
    clipPaths.push(titleClipPath);

    // Create media clips in batches
    const batchSize = 3;
    for (let i = 0; i < mediaFiles.length; i += batchSize) {
      const batch = mediaFiles.slice(i, i + batchSize);
      const promises = batch.map((file, batchIndex) => {
        const globalIndex = i + batchIndex;
        const clipPath = path.join(tempDir, `clip_${(globalIndex + 1).toString().padStart(3, '0')}.mp4`);
        return createBeautifulClip(file, clipPath, clipDuration, resolution, fps, globalIndex)
          .then(() => clipPath);
      });

      const batchClips = await Promise.all(promises);
      clipPaths.push(...batchClips);
    }

    // Concatenate clips (fade in/out on each clip provides natural transitions)
    const videoWithoutAudio = path.join(tempDir, 'video_no_audio.mp4');
    await concatenateClips(clipPaths, videoWithoutAudio, fps);

    // Add audio
    await addAudioToVideo(videoWithoutAudio, audioPath, outputPath);

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await fs.rm(tempDir, { recursive: true, force: true });

    console.log('\n✅ Beautiful music video complete!');
    console.log(`📹 Saved to: ${outputPath}\n`);
    console.log('==================================================\n');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run it!
const config: VideoConfig = {
  audioPath: '/Users/aryanjain/Desktop/Giggles/backend/assets/my_music/Dhun.mp3',
  mediaDirPath: '/Users/aryanjain/Desktop/second-anniversary',
  titlePosterPath: '/Users/aryanjain/Desktop/second-anniversary/dhun_title_poster.PNG',
  outputPath: '/Users/aryanjain/Desktop/Dhun_Music_Video.mp4',
  titleDuration: 5,
  fps: 30,
  resolution: '1280x720',
};

generateBeautifulMusicVideo(config)
  .then(() => {
    console.log('🎉 Enjoy your beautiful music video! 🎵\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
