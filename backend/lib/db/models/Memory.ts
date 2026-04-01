import mongoose, { Schema, Model } from 'mongoose';
import { IMemory, IReaction, IComment } from '@/lib/types';

const ReactionSchema = new Schema<IReaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emoji: {
      type: String,
      required: true,
      enum: ['❤️', '😂', '⭐', '🥰', '👏'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const CommentSchema = new Schema<IComment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

const MemorySchema = new Schema<IMemory>(
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
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Media
    mediaUrl: {
      type: String,
      required: true,
    },
    mediaType: {
      type: String,
      required: true,
      enum: ['photo', 'video'],
    },
    thumbnailUrl: {
      type: String,
    },

    // Content
    caption: {
      type: String,
      required: true,
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Metadata (extracted from photo)
    metadata: {
      type: {
        location: {
          latitude: Number,
          longitude: Number,
          altitude: Number,
          address: String,
        },
        camera: {
          make: String,
          model: String,
          lens: String,
        },
        context: {
          isIndoor: Boolean,
          timeOfDay: {
            type: String,
            enum: ['morning', 'afternoon', 'evening', 'night'],
          },
          season: {
            type: String,
            enum: ['spring', 'summer', 'fall', 'winter'],
          },
          isSelfie: Boolean,
        },
      },
      required: false,
    },

    // Engagement
    reactions: [ReactionSchema],
    comments: [CommentSchema],

    // Organization
    albumIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Album',
      },
    ],
    milestoneId: {
      type: Schema.Types.ObjectId,
      ref: 'Milestone',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
MemorySchema.index({ familyId: 1, childId: 1, date: -1 });
MemorySchema.index({ childId: 1, date: -1 });
MemorySchema.index({ tags: 1 });
MemorySchema.index({ uploadedBy: 1 });
MemorySchema.index({ createdAt: -1 });

// Metadata indexes for smart album queries
MemorySchema.index({ 'metadata.location.latitude': 1, 'metadata.location.longitude': 1 });
MemorySchema.index({ 'metadata.context.season': 1 });
MemorySchema.index({ 'metadata.context.timeOfDay': 1 });

const Memory: Model<IMemory> =
  mongoose.models.Memory || mongoose.model<IMemory>('Memory', MemorySchema);

export default Memory;
