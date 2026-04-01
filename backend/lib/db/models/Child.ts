import mongoose, { Schema, Model } from 'mongoose';
import { IChild } from '@/lib/types';

const ChildSchema = new Schema<IChild>(
  {
    familyId: {
      type: Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    dob: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['boy', 'girl'],
    },
    photoUrl: {
      type: String,
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
ChildSchema.index({ familyId: 1 });
ChildSchema.index({ createdBy: 1 });

const Child: Model<IChild> =
  mongoose.models.Child || mongoose.model<IChild>('Child', ChildSchema);

export default Child;
