import mongoose, { Schema, Model } from 'mongoose';
import { IAlbum } from '@/lib/types';

const AlbumSchema = new Schema<IAlbum>(
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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['auto', 'custom'],
    },
    autoType: {
      type: String,
      enum: ['family', 'travel', 'birthdays', 'funny', 'school'],
    },
    memoryIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Memory',
      },
    ],
    coverPhotoUrl: {
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
AlbumSchema.index({ familyId: 1, childId: 1 });
AlbumSchema.index({ type: 1, autoType: 1 });

const Album: Model<IAlbum> =
  mongoose.models.Album || mongoose.model<IAlbum>('Album', AlbumSchema);

export default Album;
