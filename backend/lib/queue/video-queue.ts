import { Queue, Worker, Job } from 'bullmq';
import { Types } from 'mongoose';
import { generateVideoReel, VideoReelInput, VideoReelOutput } from '@/lib/services/video-reel-generator';
import { WeeklyHighlight, MonthlyRecap } from '@/lib/db/models';

// Redis connection options
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};

// Job data types
export interface VideoReelJobData {
  type: 'weekly' | 'monthly';
  highlightId: string;
  childId: string;
  familyId: string;
  memoryIds: string[];
  title: string;
  narrationText: string;
  textOverlays?: Array<{
    text: string;
    startTime: number;
    duration: number;
    animation?: 'fade' | 'slide-up' | 'bounce' | 'typewriter';
    position?: 'top' | 'center' | 'bottom';
  }>;
  quality?: 'fast' | 'premium';
  backgroundMusicPath?: string;
}

export interface VideoReelJobResult {
  success: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
}

// Create queue
export const videoReelQueue = new Queue<VideoReelJobData, VideoReelJobResult>('video-reels', {
  connection,
  defaultJobOptions: {
    attempts: 2, // Retry once if failed
    backoff: {
      type: 'exponential',
      delay: 5000, // 5 seconds initial delay
    },
    removeOnComplete: {
      age: 24 * 60 * 60, // Keep completed jobs for 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days
    },
  },
});

// Create worker
const videoReelWorker = new Worker<VideoReelJobData, VideoReelJobResult>(
  'video-reels',
  async (job: Job<VideoReelJobData, VideoReelJobResult>) => {
    console.log(`🎬 Processing video reel job ${job.id}:`, {
      type: job.data.type,
      childId: job.data.childId,
      memoryCount: job.data.memoryIds.length,
    });

    try {
      // Update job progress
      await job.updateProgress(5);

      // Prepare input
      const input: VideoReelInput = {
        childId: new Types.ObjectId(job.data.childId),
        familyId: new Types.ObjectId(job.data.familyId),
        memoryIds: job.data.memoryIds.map((id) => new Types.ObjectId(id)),
        title: job.data.title,
        narrationText: job.data.narrationText,
        textOverlays: job.data.textOverlays,
        quality: job.data.quality || 'fast',
        backgroundMusicPath: job.data.backgroundMusicPath || getBackgroundMusicPath('joyful'), // Use provided path or default
      };

      // Generate video reel with progress tracking
      const result = await generateVideoReel(input, (progress) => {
        // Update job progress (5-95%)
        const progressPercent = Math.floor(5 + (progress.progress * 0.9));
        job.updateProgress(progressPercent).catch(console.error);
        console.log(`Job ${job.id}: ${progress.stage} - ${progressPercent}%`);
      });

      await job.updateProgress(95);

      // Update database with video URLs
      if (job.data.type === 'weekly') {
        await WeeklyHighlight.findByIdAndUpdate(job.data.highlightId, {
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
          videoDuration: result.duration,
          status: 'completed',
        });
      } else {
        await MonthlyRecap.findByIdAndUpdate(job.data.highlightId, {
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
          videoDuration: result.duration,
          status: 'completed',
        });
      }

      await job.updateProgress(100);

      console.log(`✅ Video reel job ${job.id} completed:`, result.videoUrl);

      return {
        success: true,
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
        duration: result.duration,
      };
    } catch (error: any) {
      console.error(`❌ Video reel job ${job.id} failed:`, error);

      // Update database with error status
      const updateData = {
        status: 'failed',
        errorMessage: error.message,
      };

      if (job.data.type === 'weekly') {
        await WeeklyHighlight.findByIdAndUpdate(job.data.highlightId, updateData);
      } else {
        await MonthlyRecap.findByIdAndUpdate(job.data.highlightId, updateData);
      }

      return {
        success: false,
        error: error.message,
      };
    }
  },
  {
    connection,
    concurrency: parseInt(process.env.VIDEO_QUEUE_CONCURRENCY || '2'), // Process 2 videos at a time
    limiter: {
      max: 5, // Max 5 jobs per duration
      duration: 60000, // Per minute
    },
  }
);

// Worker event handlers
videoReelWorker.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completed successfully`, result);
});

videoReelWorker.on('failed', (job, error) => {
  console.error(`❌ Job ${job?.id} failed:`, error.message);
});

videoReelWorker.on('error', (error) => {
  console.error('❌ Worker error:', error);
});

/**
 * Add a video reel generation job to the queue
 */
export async function queueVideoReelGeneration(
  data: VideoReelJobData
): Promise<string> {
  const job = await videoReelQueue.add('generate-reel', data, {
    priority: data.type === 'weekly' ? 1 : 2, // Weekly has higher priority
  });

  console.log(`📋 Video reel job queued: ${job.id}`, {
    type: data.type,
    childId: data.childId,
  });

  return job.id || '';
}

/**
 * Get job status and progress
 */
export async function getVideoReelJobStatus(jobId: string) {
  const job = await videoReelQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;
  const returnValue = job.returnvalue;

  return {
    id: job.id,
    state, // 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'
    progress, // 0-100
    result: returnValue,
    data: job.data,
  };
}

/**
 * Cancel a video reel job
 */
export async function cancelVideoReelJob(jobId: string): Promise<boolean> {
  const job = await videoReelQueue.getJob(jobId);

  if (!job) {
    return false;
  }

  await job.remove();
  console.log(`🚫 Video reel job ${jobId} cancelled`);
  return true;
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    videoReelQueue.getWaitingCount(),
    videoReelQueue.getActiveCount(),
    videoReelQueue.getCompletedCount(),
    videoReelQueue.getFailedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active + completed + failed,
  };
}

/**
 * Helper function to get background music path based on mood
 */
function getBackgroundMusicPath(mood: string): string | undefined {
  const musicLibraryPath = process.env.MUSIC_LIBRARY_PATH || '/app/assets/music';

  const moodToFile: Record<string, string> = {
    joyful: 'upbeat-playful.mp3',
    emotional: 'warm-emotional.mp3',
    calm: 'gentle-calm.mp3',
    adventure: 'energetic-adventure.mp3',
    funny: 'quirky-fun.mp3',
  };

  const filename = moodToFile[mood] || moodToFile.joyful;
  return `${musicLibraryPath}/${filename}`;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Closing video reel worker...');
  await videoReelWorker.close();
});

export default videoReelWorker;
