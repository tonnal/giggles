import mongoose, { Schema, Model } from 'mongoose';

export interface IMonthlyRecap {
  _id: mongoose.Types.ObjectId;
  familyId: mongoose.Types.ObjectId;
  childId: mongoose.Types.ObjectId;

  // Month info
  month: number; // 1-12
  year: number;
  monthName: string; // "January", "February", etc.

  // Content
  title: string; // "January Adventures" or "Your Amazing February"
  summary: string; // GPT-5.1 generated loving summary
  narrationText: string; // Full narration script
  narrationAudioUrl?: string; // OpenAI TTS audio

  // Stats (fun metrics)
  stats: {
    totalMemories: number;
    newMilestones: number;
    favoriteTags: string[]; // Top 3 tags
    busiestDay: Date;
    memoriesCount: number;
  };

  // Selected memories
  highlightMemoryIds: mongoose.Types.ObjectId[]; // Top 10-15 moments
  coverImageUrl: string;

  // Media
  collageImageUrl?: string; // Multi-page collage
  musicRecommendation?: string; // Suggested background music

  // Video reel
  videoUrl?: string; // MP4 video reel
  thumbnailUrl?: string; // Video thumbnail
  videoDuration?: number; // Duration in seconds
  videoJobId?: string; // BullMQ job ID
  status: 'generating' | 'completed' | 'failed'; // Video generation status
  errorMessage?: string; // Error if failed

  // Growth summary
  growthSummary?: string; // "This month, Emma learned to..."

  // Metadata
  viewCount: number;
  isViewed: boolean;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MonthlyRecapSchema = new Schema<IMonthlyRecap>(
  {
    familyId: {
      type: Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
    },
    childId: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    monthName: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    narrationText: {
      type: String,
      required: true,
    },
    narrationAudioUrl: {
      type: String,
    },
    stats: {
      totalMemories: { type: Number, default: 0 },
      newMilestones: { type: Number, default: 0 },
      favoriteTags: [{ type: String }],
      busiestDay: { type: Date },
      memoriesCount: { type: Number, default: 0 },
    },
    highlightMemoryIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Memory',
      },
    ],
    coverImageUrl: {
      type: String,
      required: true,
    },
    collageImageUrl: {
      type: String,
    },
    musicRecommendation: {
      type: String,
    },
    videoUrl: {
      type: String,
    },
    thumbnailUrl: {
      type: String,
    },
    videoDuration: {
      type: Number,
    },
    videoJobId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['generating', 'completed', 'failed'],
      default: 'generating',
    },
    errorMessage: {
      type: String,
    },
    growthSummary: {
      type: String,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    isViewed: {
      type: Boolean,
      default: false,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
MonthlyRecapSchema.index({ familyId: 1, childId: 1, year: -1, month: -1 });
MonthlyRecapSchema.index({ childId: 1, year: 1, month: 1 }, { unique: true });

const MonthlyRecap: Model<IMonthlyRecap> =
  mongoose.models.MonthlyRecap ||
  mongoose.model<IMonthlyRecap>('MonthlyRecap', MonthlyRecapSchema);

export default MonthlyRecap;
