import mongoose, { Schema, Model } from 'mongoose';
import { IStorybook, ICoverDesign, IStorybookPage, IOrderInfo } from '@/lib/types';

const CoverDesignSchema = new Schema<ICoverDesign>(
  {
    imageUrl: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
    },
  },
  { _id: false }
);

const StorybookPageSchema = new Schema<IStorybookPage>(
  {
    pageNumber: {
      type: Number,
      required: true,
    },
    layout: {
      type: String,
      required: true,
      enum: ['photo-full', 'photo-left-text-right', 'illustration-full', 'text-only'],
    },
    imageType: {
      type: String,
      required: true,
      enum: ['photo', 'generated'],
    },
    imageUrl: {
      type: String,
      required: true,
    },
    memoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Memory',
    },
    caption: {
      type: String,
      required: true,
    },
    captionSecondary: {
      type: String,
    },
    narration: {
      type: String,
    },
    narrationSecondary: {
      type: String,
    },
  },
  { _id: false }
);

const OrderInfoSchema = new Schema<IOrderInfo>(
  {
    orderedAt: {
      type: Date,
      required: true,
    },
    printSize: {
      type: String,
      required: true,
      enum: ['small', 'medium', 'large'],
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    shippingAddress: {
      type: {
        name: { type: String, required: true },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true },
      },
      required: true,
    },
    trackingNumber: {
      type: String,
    },
    status: {
      type: String,
      required: true,
      enum: ['processing', 'printing', 'shipped', 'delivered'],
      default: 'processing',
    },
  },
  { _id: false }
);

const StorybookSchema = new Schema<IStorybook>(
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['monthly', 'yearbook', 'milestone', 'vacation', 'custom'],
    },
    theme: {
      type: String,
      required: true,
      enum: ['cute', 'watercolor', 'adventure', 'bedtime', 'minimal'],
    },
    tone: {
      type: String,
      required: true,
      enum: ['funny', 'emotional', 'calm'],
    },
    language: {
      type: String,
      required: true,
      enum: ['en', 'bilingual'],
      default: 'en',
    },
    secondaryLanguage: {
      type: String,
    },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'locked', 'ordered', 'shipped'],
      default: 'draft',
    },
    coverDesign: {
      type: CoverDesignSchema,
      required: true,
    },
    pages: [StorybookPageSchema],
    orderInfo: OrderInfoSchema,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lockedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
StorybookSchema.index({ familyId: 1, childId: 1 });
StorybookSchema.index({ status: 1 });
StorybookSchema.index({ createdAt: -1 });

const Storybook: Model<IStorybook> =
  mongoose.models.Storybook ||
  mongoose.model<IStorybook>('Storybook', StorybookSchema);

export default Storybook;
