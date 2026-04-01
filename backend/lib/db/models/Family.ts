import mongoose, { Schema, Model } from 'mongoose';
import { IFamily, IFamilyMember } from '@/lib/types';
import { nanoid } from 'nanoid';

const FamilyMemberSchema = new Schema<IFamilyMember>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['parent', 'grandparent', 'relative'],
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const FamilySchema = new Schema<IFamily>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      default: () => nanoid(8),
    },
    members: [FamilyMemberSchema],
    childrenIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Child',
      },
    ],
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

// Indexes (inviteCode index is created automatically by unique: true)
FamilySchema.index({ 'members.userId': 1 });

const Family: Model<IFamily> =
  mongoose.models.Family || mongoose.model<IFamily>('Family', FamilySchema);

export default Family;
