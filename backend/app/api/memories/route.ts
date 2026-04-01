import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { Memory, Album, Milestone } from '@/lib/db/models';
import { ICreateMemoryRequest } from '@/lib/types';
import {
  successResponse,
  errorResponse,
  withMiddleware,
  validateRequired,
  getPaginationParams,
} from '@/lib/utils/api-helpers';
import { tagMemory } from '@/lib/services/openai';
import { requireAuth, getCurrentUserId } from '@/lib/auth/session';
import { verifyFamilyAccess } from '@/lib/utils/auth-helpers';

/**
 * POST /api/memories
 * Create a new memory with AI auto-tagging
 */
export async function POST(request: NextRequest) {
  return withMiddleware(async () => {
    // Require authentication
    await requireAuth();
    const userId = await getCurrentUserId();

    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body: ICreateMemoryRequest = await request.json();

    // Validate required fields
    const validation = validateRequired(body, [
      'familyId',
      'childId',
      'mediaUrl',
      'mediaType',
      'caption',
    ]);
    if (!validation.valid) {
      return errorResponse(`Missing required fields: ${validation.missing?.join(', ')}`);
    }

    const { familyId, childId, mediaUrl, mediaType, caption, date, thumbnailUrl, metadata } = body;

    // Verify user has access to this family
    const { error } = await verifyFamilyAccess(familyId, userId);
    if (error) return error;

    console.log('🎤 Creating memory with caption:', caption.substring(0, 100) + '...');
    if (metadata) {
      console.log('📸 Memory includes metadata:', {
        hasLocation: !!metadata.location,
        hasCamera: !!metadata.camera,
        hasContext: !!metadata.context,
      });
    }

    // ============================================
    // AI AUTO-TAGGING with GPT-5.1
    // ============================================
    console.log('🤖 Auto-tagging memory with GPT-5.1...');

    const taggingResult = await tagMemory({
      caption,
      imageUrl: mediaUrl,
    });

    console.log('✨ AI Tags generated:', taggingResult.tags);
    if (taggingResult.suggestedMilestone) {
      console.log('🎯 Milestone detected:', taggingResult.suggestedMilestone.title);
    }

    // Create memory
    const memory = await Memory.create({
      familyId: new Types.ObjectId(familyId),
      childId: new Types.ObjectId(childId),
      uploadedBy: userId,
      mediaUrl,
      mediaType,
      thumbnailUrl,
      caption,
      tags: taggingResult.tags,
      date: date ? new Date(date) : new Date(),
      metadata, // Save extracted photo metadata
      reactions: [],
      comments: [],
      albumIds: [],
    });

    // ============================================
    // AUTO-CREATE MILESTONE if detected by AI
    // ============================================
    if (taggingResult.suggestedMilestone) {
      try {
        const milestone = await Milestone.create({
          childId: new Types.ObjectId(childId),
          familyId: new Types.ObjectId(familyId),
          title: taggingResult.suggestedMilestone.title,
          category: taggingResult.suggestedMilestone.category,
          date: memory.date,
          memoryId: memory._id,
          createdBy: userId,
        });

        memory.milestoneId = milestone._id;
        await memory.save();

        console.log('🎯 Auto-created milestone:', milestone.title);
      } catch (error) {
        console.error('Failed to auto-create milestone:', error);
        // Don't fail memory creation if milestone creation fails
      }
    }

    // ============================================
    // AUTO-ADD TO ALBUMS based on tags
    // ============================================
    try {
      const albumPromises: Promise<any>[] = [];

      // Family album
      if (taggingResult.tags.includes('family')) {
        albumPromises.push(addToAutoAlbum(memory._id, familyId, childId, 'family'));
      }

      // Travel album
      if (
        taggingResult.tags.some((tag) =>
          ['travel', 'vacation', 'trip', 'beach', 'mountain'].includes(tag)
        )
      ) {
        albumPromises.push(addToAutoAlbum(memory._id, familyId, childId, 'travel'));
      }

      // Funny moments album
      if (
        taggingResult.tags.some((tag) => ['funny', 'silly', 'playful', 'laughing'].includes(tag))
      ) {
        albumPromises.push(addToAutoAlbum(memory._id, familyId, childId, 'funny'));
      }

      // School album
      if (taggingResult.tags.some((tag) => ['school', 'learning', 'education'].includes(tag))) {
        albumPromises.push(addToAutoAlbum(memory._id, familyId, childId, 'school'));
      }

      // Birthdays album
      if (taggingResult.tags.some((tag) => ['birthday', 'party', 'celebration'].includes(tag))) {
        albumPromises.push(addToAutoAlbum(memory._id, familyId, childId, 'birthdays'));
      }

      await Promise.all(albumPromises);
    } catch (error) {
      console.error('Failed to auto-add to albums:', error);
      // Don't fail memory creation
    }

    console.log('✅ Memory created:', memory._id);

    return successResponse(memory, 'Memory created successfully');
  });
}

/**
 * GET /api/memories
 * Get memories with filters and pagination (only for families user has access to)
 */
export async function GET(request: NextRequest) {
  return withMiddleware(async () => {
    // Require authentication
    await requireAuth();
    const userId = await getCurrentUserId();

    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);

    const familyId = searchParams.get('familyId');
    const childId = searchParams.get('childId');
    const tags = searchParams.get('tags')?.split(',');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Verify user has access to the family if familyId is provided
    if (familyId) {
      const { error } = await verifyFamilyAccess(familyId, userId);
      if (error) return error;
    }

    const { page, limit, skip } = getPaginationParams(request);

    // Build query
    const query: any = {};
    if (familyId) query.familyId = new Types.ObjectId(familyId);
    if (childId) query.childId = new Types.ObjectId(childId);
    if (tags && tags.length > 0) query.tags = { $in: tags };
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Get memories
    const [memories, total] = await Promise.all([
      Memory.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('uploadedBy', 'name avatar')
        .populate('reactions.userId', 'name avatar')
        .populate('comments.userId', 'name avatar')
        .lean(),
      Memory.countDocuments(query),
    ]);

    return successResponse({
      memories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });
}

// ============================================
// Helper Functions
// ============================================

/**
 * Add memory to an auto-generated album
 */
async function addToAutoAlbum(
  memoryId: Types.ObjectId,
  familyId: string,
  childId: string,
  albumType: 'family' | 'travel' | 'birthdays' | 'funny' | 'school'
) {
  const userId = new Types.ObjectId(); // TODO: Get from auth

  // Find or create auto album
  let album = await Album.findOne({
    familyId: new Types.ObjectId(familyId),
    childId: new Types.ObjectId(childId),
    type: 'auto',
    autoType: albumType,
  });

  if (!album) {
    // Create new auto album
    const albumNames = {
      family: 'Family Moments',
      travel: 'Travel & Adventures',
      birthdays: 'Birthdays & Celebrations',
      funny: 'Funny Moments',
      school: 'School Days',
    };

    album = await Album.create({
      familyId: new Types.ObjectId(familyId),
      childId: new Types.ObjectId(childId),
      name: albumNames[albumType],
      type: 'auto',
      autoType: albumType,
      memoryIds: [],
      createdBy: userId,
    });

    console.log('📂 Auto-created album:', albumNames[albumType]);
  }

  // Add memory to album if not already added
  if (!album.memoryIds.includes(memoryId)) {
    album.memoryIds.push(memoryId);
    await album.save();

    // Update memory's albumIds
    await Memory.updateOne({ _id: memoryId }, { $addToSet: { albumIds: album._id } });

    console.log(`✅ Added memory to ${albumType} album`);
  }
}
