import mongoose, { Schema, Model } from 'mongoose';
import { IUser } from '@/lib/types';

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
    },
    authProvider: {
      type: String,
      required: true,
      enum: ['google', 'apple'],
    },
    providerAccountId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups (email index is created automatically by unique: true)
UserSchema.index({ providerAccountId: 1, authProvider: 1 });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
