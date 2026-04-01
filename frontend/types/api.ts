export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  authProvider: 'google' | 'apple';
  createdAt: string;
}

export interface Family {
  _id: string;
  name: string;
  inviteCode: string;
  members: FamilyMember[];
  childrenIds: Child[] | string[];
  createdBy: string;
  createdAt: string;
}

export interface FamilyMember {
  userId: User | string;
  role: 'parent' | 'grandparent' | 'relative';
  joinedAt: string;
}

export interface Child {
  _id: string;
  familyId: string;
  name: string;
  dob?: string;
  gender?: 'boy' | 'girl';
  photoUrl?: string;
  createdBy: string;
  createdAt: string;
}

export interface Memory {
  _id: string;
  familyId: string;
  childId: string;
  uploadedBy: User | string;
  mediaUrl: string;
  mediaType: 'photo' | 'video';
  thumbnailUrl?: string;
  caption: string;
  tags: string[];
  date: string;
  metadata?: MemoryMetadata;
  reactions: Reaction[];
  comments: Comment[];
  albumIds: string[];
  milestoneId?: string;
  createdAt: string;
}

export interface MemoryMetadata {
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  camera?: {
    make?: string;
    model?: string;
  };
  context?: {
    isIndoor?: boolean;
    timeOfDay?: string;
    season?: string;
  };
}

export interface Reaction {
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface Comment {
  userId: User | string;
  text: string;
  createdAt: string;
}

export interface Album {
  _id: string;
  familyId: string;
  childId: string;
  name: string;
  type: 'auto' | 'custom';
  autoType?: string;
  memoryIds: string[];
  coverPhotoUrl?: string;
  createdBy: string;
  createdAt: string;
}

export interface Milestone {
  _id: string;
  childId: string;
  familyId: string;
  title: string;
  category: string;
  description?: string;
  date: string;
  memoryId?: string;
  createdBy: string;
  createdAt: string;
}

export interface GrowthLog {
  _id: string;
  childId: string;
  date: string;
  height?: number;
  weight?: number;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export interface WeeklyHighlight {
  _id: string;
  familyId: string;
  childId: string;
  title: string;
  summary: string;
  coverImageUrl: string;
  videoUrl?: string;
  memoryIds: string[];
  weekStartDate: string;
  weekEndDate: string;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
