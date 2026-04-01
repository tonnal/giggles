import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { Child, Family } from '@/lib/db/models';
import { ICreateChildRequest } from '@/lib/types';
import {
  successResponse,
  errorResponse,
  withMiddleware,
  validateRequired,
} from '@/lib/utils/api-helpers';
import { requireAuth, getCurrentUserId } from '@/lib/auth/session';

/**
 * POST /api/children
 * Create a new child profile
 */
export async function POST(request: NextRequest) {
  return withMiddleware(async () => {
    // Require authentication
    await requireAuth();
    const userId = await getCurrentUserId();

    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body: ICreateChildRequest = await request.json();

    // Validate required fields
    const validation = validateRequired(body, ['familyId', 'name']);
    if (!validation.valid) {
      return errorResponse(`Missing required fields: ${validation.missing?.join(', ')}`);
    }

    const { familyId, name, dob, gender, photoUrl } = body;

    // Verify family exists and user is a member
    const family = await Family.findById(familyId);
    if (!family) {
      return errorResponse('Family not found', 404);
    }

    // Check if user is a member of this family
    const isMember = family.members.some((member) => member.userId.equals(userId));
    if (!isMember) {
      return errorResponse('You do not have access to this family', 403);
    }

    // Create child
    const child = await Child.create({
      familyId: new Types.ObjectId(familyId),
      name,
      dob: dob ? new Date(dob) : undefined,
      gender,
      photoUrl,
      createdBy: userId,
    });

    // Add child to family's childrenIds
    family.childrenIds.push(child._id);
    await family.save();

    console.log('✅ Child created:', child._id);

    return successResponse(child, 'Child profile created successfully');
  });
}

/**
 * GET /api/children?familyId=xxx
 * Get all children for a family (only if user is a member)
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

    if (!familyId) {
      return errorResponse('familyId is required');
    }

    // Verify family exists and user is a member
    const family = await Family.findById(familyId);
    if (!family) {
      return errorResponse('Family not found', 404);
    }

    const isMember = family.members.some((member) => member.userId.equals(userId));
    if (!isMember) {
      return errorResponse('You do not have access to this family', 403);
    }

    const children = await Child.find({
      familyId: new Types.ObjectId(familyId),
    })
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(children);
  });
}
