import { Types } from 'mongoose';

// ============================================
// User Types
// ============================================

export type AuthProvider = 'google' | 'apple';

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  name: string;
  avatar?: string;
  authProvider: AuthProvider;
  providerAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Family Types
// ============================================

export type FamilyRole = 'parent' | 'grandparent' | 'relative';

export interface IFamilyMember {
  userId: Types.ObjectId;
  role: FamilyRole;
  joinedAt: Date;
}

export interface IFamily {
  _id: Types.ObjectId;
  name: string;
  inviteCode: string;
  members: IFamilyMember[];
  childrenIds: Types.ObjectId[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Child Types
// ============================================

export type Gender = 'boy' | 'girl';

export interface IChild {
  _id: Types.ObjectId;
  familyId: Types.ObjectId;
  name: string;
  dob?: Date;
  gender?: Gender;
  photoUrl?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Memory Types
// ============================================

export type MediaType = 'photo' | 'video';
export type ReactionEmoji = '❤️' | '😂' | '⭐' | '🥰' | '👏';

export interface IReaction {
  userId: Types.ObjectId;
  emoji: ReactionEmoji;
  createdAt: Date;
}

export interface IComment {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  text: string;
  createdAt: Date;
}

// Photo Metadata Types
export interface IPhotoMetadata {
  // Location data
  location?: {
    latitude: number;
    longitude: number;
    altitude?: number;
    address?: string;
  };

  // Camera info
  camera?: {
    make?: string;
    model?: string;
    lens?: string;
  };

  // Context
  context?: {
    isIndoor?: boolean;
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    season?: 'spring' | 'summer' | 'fall' | 'winter';
    isSelfie?: boolean;
  };
}

export interface IMemory {
  _id: Types.ObjectId;
  familyId: Types.ObjectId;
  childId: Types.ObjectId;
  uploadedBy: Types.ObjectId;

  // Media
  mediaUrl: string;
  mediaType: MediaType;
  thumbnailUrl?: string;

  // Content
  caption: string;
  tags: string[];
  date: Date;

  // Metadata (extracted from photo)
  metadata?: IPhotoMetadata;

  // Engagement
  reactions: IReaction[];
  comments: IComment[];

  // Organization
  albumIds: Types.ObjectId[];
  milestoneId?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Album Types
// ============================================

export type AlbumType = 'auto' | 'custom';
export type AutoAlbumType = 'family' | 'travel' | 'birthdays' | 'funny' | 'school';

export interface IAlbum {
  _id: Types.ObjectId;
  familyId: Types.ObjectId;
  childId: Types.ObjectId;

  name: string;
  type: AlbumType;
  autoType?: AutoAlbumType;

  memoryIds: Types.ObjectId[];
  coverPhotoUrl?: string;

  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Milestone Types
// ============================================

export type MilestoneCategory =
  | 'first_word'
  | 'first_steps'
  | 'first_day_school'
  | 'first_tooth'
  | 'first_birthday'
  | 'other';

export interface IMilestone {
  _id: Types.ObjectId;
  childId: Types.ObjectId;
  familyId: Types.ObjectId;

  title: string;
  category: MilestoneCategory;
  description?: string;
  date: Date;

  memoryId?: Types.ObjectId;

  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Growth Log Types
// ============================================

export interface IGrowthLog {
  _id: Types.ObjectId;
  childId: Types.ObjectId;

  date: Date;
  height?: number; // in cm
  weight?: number; // in kg
  note?: string;

  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Storybook Types
// ============================================

export type StorybookType = 'monthly' | 'yearbook' | 'milestone' | 'vacation' | 'custom';
export type StorybookTheme = 'cute' | 'watercolor' | 'adventure' | 'bedtime' | 'minimal';
export type StorybookTone = 'funny' | 'emotional' | 'calm';
export type StorybookStatus = 'draft' | 'locked' | 'ordered' | 'shipped';
export type PageLayout = 'photo-full' | 'photo-left-text-right' | 'illustration-full' | 'text-only';
export type ImageType = 'photo' | 'generated';
export type PrintSize = 'small' | 'medium' | 'large';
export type OrderStatus = 'processing' | 'printing' | 'shipped' | 'delivered';

export interface ICoverDesign {
  imageUrl: string;
  title: string;
  subtitle?: string;
}

export interface IStorybookPage {
  pageNumber: number;
  layout: PageLayout;

  imageType: ImageType;
  imageUrl: string;
  memoryId?: Types.ObjectId;

  caption: string;
  captionSecondary?: string;
  narration?: string;
  narrationSecondary?: string;
}

export interface IOrderInfo {
  orderedAt: Date;
  printSize: PrintSize;
  quantity: number;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  trackingNumber?: string;
  status: OrderStatus;
}

export interface IStorybook {
  _id: Types.ObjectId;
  familyId: Types.ObjectId;
  childId: Types.ObjectId;

  title: string;
  type: StorybookType;

  theme: StorybookTheme;
  tone: StorybookTone;
  language: 'en' | 'bilingual';
  secondaryLanguage?: string;

  status: StorybookStatus;

  coverDesign: ICoverDesign;
  pages: IStorybookPage[];

  orderInfo?: IOrderInfo;

  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  lockedAt?: Date;
}

// ============================================
// AI Service Types
// ============================================

export interface IMemoryTaggingInput {
  caption: string;
  imageUrl?: string;
}

export interface IMemoryTaggingOutput {
  tags: string[];
  suggestedMilestone?: {
    category: MilestoneCategory;
    title: string;
  };
}

export interface IStorybookGenerationInput {
  childId: string;
  familyId: string;
  type: StorybookType;
  theme: StorybookTheme;
  tone: StorybookTone;
  dateRange: {
    start: Date;
    end: Date;
  };
  bilingual?: boolean;
  secondaryLanguage?: string;
  title?: string;
}

export interface ISelectedMemory {
  memoryId: Types.ObjectId;
  caption: string;
  tags: string[];
  date: Date;
  mediaUrl: string;
  score: number;
}

export interface IGeneratedPage {
  pageNumber: number;
  layout: PageLayout;
  imageType: ImageType;
  imageUrl: string;
  memoryId?: Types.ObjectId;
  caption: string;
  captionSecondary?: string;
  narration?: string;
  narrationSecondary?: string;
}

// ============================================
// API Response Types
// ============================================

export interface IApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface IPaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Request Body Types
// ============================================

export interface ICreateChildRequest {
  familyId: string;
  name: string;
  dob?: string;
  gender?: Gender;
  photoUrl?: string;
}

export interface ICreateMemoryRequest {
  familyId: string;
  childId: string;
  mediaUrl: string;
  mediaType: MediaType;
  caption: string;
  date?: string;
  thumbnailUrl?: string;
  metadata?: IPhotoMetadata; // Extracted photo metadata
}

export interface ICreateFamilyRequest {
  name: string;
  childName: string;
  childDob?: string;
  childGender?: Gender;
}

export interface IJoinFamilyRequest {
  inviteCode: string;
}

export interface IAddReactionRequest {
  emoji: ReactionEmoji;
}

export interface IAddCommentRequest {
  text: string;
}

export interface ICreateMilestoneRequest {
  childId: string;
  title: string;
  category: MilestoneCategory;
  description?: string;
  date: string;
  memoryId?: string;
}

export interface ICreateGrowthLogRequest {
  childId: string;
  date: string;
  height?: number;
  weight?: number;
  note?: string;
}

export interface IGenerateStorybookRequest {
  childId: string;
  type: StorybookType;
  theme: StorybookTheme;
  tone: StorybookTone;
  startDate: string;
  endDate: string;
  bilingual?: boolean;
  secondaryLanguage?: string;
  title?: string;
}

export interface IOrderStorybookRequest {
  printSize: PrintSize;
  quantity: number;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}
