/**
 * FAST Music Video Generator for "Dhun"
 * Optimized for speed while maintaining cool visual effects
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
 * Get all media files from directory
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

  return mediaFiles
    .map(file => path.join(dirPath, file))
    .sort(() => Math.random() - 0.5);
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
 * Create a FAST clip with simple scale and fade
 */
async function createFastClip(
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
    const fadeDuration = 0.3; // Fast fade

    // FIT entire image/video without cropping (letterbox if needed)
    const filterComplex = isVideo(inputPath)
      ? `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,fade=t=in:st=0:d=${fadeDuration},fade=t=out:st=${duration - fadeDuration}:d=${fadeDuration},fps=${fps}[v]`
      : `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,fade=t=in:st=0:d=${fadeDuration},fade=t=out:st=${duration - fadeDuration}:d=${fadeDuration},fps=${fps}[v]`;

    const command = ffmpeg(inputPath);

    // For images, loop for duration
    if (!isVideo(inputPath)) {
      command.inputOptions(['-loop', '1', '-t', duration.toString()]);
    } else {
      // For videos, trim to duration
      command.inputOptions(['-t', duration.toString()]);
    }

    command
      .complexFilter(filterComplex)
      .outputOptions([
        '-map', '[v]',
        '-c:v', 'libx264',
        '-preset', 'faster', // FASTER preset for speed
        '-crf', '28', // Higher CRF = faster encoding (slightly lower quality but still good)
        '-pix_fmt', 'yuv420p',
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });
}

/**
 * Concatenate clips using concat demuxer
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
        '-crf', '28',
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
 * Main function - FAST version
 */
async function generateMusicVideoFast(config: VideoConfig): Promise<void> {
  try {
    console.log('\n🎬 FAST Music Video Generator for "Dhun" 🎵\n');
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

    // Get media files
    console.log('📁 Gathering media...');
    const mediaFiles = await getMediaFiles(mediaDirPath, titlePosterPath);
    console.log(`📸 Found ${mediaFiles.length} files\n`);

    // Calculate clip durations
    const remainingDuration = audioDuration - titleDuration;
    const clipDuration = remainingDuration / mediaFiles.length;

    console.log(`⏱️  Structure:`);
    console.log(`   Title: ${titleDuration}s`);
    console.log(`   ${mediaFiles.length} clips × ${clipDuration.toFixed(1)}s`);
    console.log(`   Total: ${audioDuration.toFixed(1)}s\n`);

    // Create temp directory
    const tempDir = path.join(path.dirname(outputPath), 'temp_clips_fast');
    await fs.mkdir(tempDir, { recursive: true });

    const clipPaths: string[] = [];

    // Create title clip
    console.log('🎬 Creating clips:\n');
    const titleClipPath = path.join(tempDir, 'clip_000.mp4');
    await createFastClip(titlePosterPath, titleClipPath, titleDuration, resolution, fps, -1);
    clipPaths.push(titleClipPath);

    // Create media clips (process in parallel batches for speed)
    const batchSize = 3; // Process 3 at a time
    for (let i = 0; i < mediaFiles.length; i += batchSize) {
      const batch = mediaFiles.slice(i, i + batchSize);
      const promises = batch.map((file, batchIndex) => {
        const globalIndex = i + batchIndex;
        const clipPath = path.join(tempDir, `clip_${(globalIndex + 1).toString().padStart(3, '0')}.mp4`);
        return createFastClip(file, clipPath, clipDuration, resolution, fps, globalIndex)
          .then(() => clipPath);
      });

      const batchClips = await Promise.all(promises);
      clipPaths.push(...batchClips);
    }

    // Concatenate
    const videoWithoutAudio = path.join(tempDir, 'video_no_audio.mp4');
    await concatenateClips(clipPaths, videoWithoutAudio, fps);

    // Add audio
    await addAudioToVideo(videoWithoutAudio, audioPath, outputPath);

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await fs.rm(tempDir, { recursive: true, force: true });

    console.log('\n✅ Music video complete!');
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
  resolution: '1280x720', // 720p for faster encoding
};

generateMusicVideoFast(config)
  .then(() => {
    console.log('🎉 Enjoy your music video! 🎵\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
