import mongoose, { Schema, Model } from 'mongoose';

export interface IWeeklyHighlight {
  _id: mongoose.Types.ObjectId;
  familyId: mongoose.Types.ObjectId;
  childId: mongoose.Types.ObjectId;

  // Week info
  weekStartDate: Date;
  weekEndDate: Date;
  weekNumber: number; // Week of the year
  year: number;

  // Content
  title: string; // "Your Week in Giggles" or "Adventure Week!" etc
  summary: string; // GPT-5.1 generated playful summary
  narrationText: string; // Script for audio narration
  narrationAudioUrl?: string; // OpenAI TTS generated audio

  // Selected memories
  memoryIds: mongoose.Types.ObjectId[]; // Top 5-8 memories
  coverImageUrl: string; // First memory or collage

  // Collage/media
  collageImageUrl?: string; // Gemini generated collage
  collageLayout: 'grid' | 'scrapbook' | 'polaroid' | 'filmstrip';

  // Video reel
  videoUrl?: string; // MP4 video reel
  thumbnailUrl?: string; // Video thumbnail
  videoDuration?: number; // Duration in seconds
  videoJobId?: string; // BullMQ job ID
  status: 'generating' | 'completed' | 'failed'; // Video generation status
  errorMessage?: string; // Error if failed

  // Metadata
  viewCount: number;
  isViewed: boolean;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WeeklyHighlightSchema = new Schema<IWeeklyHighlight>(
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
    weekStartDate: {
      type: Date,
      required: true,
    },
    weekEndDate: {
      type: Date,
      required: true,
    },
    weekNumber: {
      type: Number,
      required: true,
    },
    year: {
      type: Number,
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
    memoryIds: [
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
    collageLayout: {
      type: String,
      enum: ['grid', 'scrapbook', 'polaroid', 'filmstrip'],
      default: 'grid',
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
WeeklyHighlightSchema.index({ familyId: 1, childId: 1, weekStartDate: -1 });
WeeklyHighlightSchema.index({ childId: 1, year: 1, weekNumber: 1 });

const WeeklyHighlight: Model<IWeeklyHighlight> =
  mongoose.models.WeeklyHighlight ||
  mongoose.model<IWeeklyHighlight>('WeeklyHighlight', WeeklyHighlightSchema);

export default WeeklyHighlight;
