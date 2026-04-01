import mongoose, { Schema, Model } from 'mongoose';
import { IGrowthLog } from '@/lib/types';

const GrowthLogSchema = new Schema<IGrowthLog>(
  {
    childId: {
      type: Schema.Types.ObjectId,
      ref: 'Child',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    height: {
      type: Number,
      min: 0,
    },
    weight: {
      type: Number,
      min: 0,
    },
    note: {
      type: String,
      trim: true,
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
GrowthLogSchema.index({ childId: 1, date: -1 });

const GrowthLog: Model<IGrowthLog> =
  mongoose.models.GrowthLog ||
  mongoose.model<IGrowthLog>('GrowthLog', GrowthLogSchema);

export default GrowthLog;
