import mongoose, { Schema, Model } from 'mongoose';
import { IMilestone } from '@/lib/types';

const MilestoneSchema = new Schema<IMilestone>(
  {
    childId: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
    },
    familyId: {
      type: Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'first_word',
        'first_steps',
        'first_day_school',
        'first_tooth',
        'first_birthday',
        'other',
      ],
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    memoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Memory',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
MilestoneSchema.index({ childId: 1, date: -1 });
MilestoneSchema.index({ category: 1 });

const Milestone: Model<IMilestone> =
  mongoose.models.Milestone ||
  mongoose.model<IMilestone>('Milestone', MilestoneSchema);

export default Milestone;
