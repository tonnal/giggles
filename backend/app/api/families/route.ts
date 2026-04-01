import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { Family, Child } from '@/lib/db/models';
import { ICreateFamilyRequest } from '@/lib/types';
import {
  successResponse,
  errorResponse,
  withMiddleware,
  validateRequired,
} from '@/lib/utils/api-helpers';
import { requireAuth, getCurrentUserId } from '@/lib/auth/session';

/**
 * POST /api/families
 * Create a new family (during onboarding)
 */
export async function POST(request: NextRequest) {
  return withMiddleware(async () => {
    // Require authentication
    await requireAuth();
    const userId = await getCurrentUserId();

    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const body: ICreateFamilyRequest = await request.json();

    // Validate required fields
    const validation = validateRequired(body, ['name', 'childName']);
    if (!validation.valid) {
      return errorResponse(`Missing required fields: ${validation.missing?.join(', ')}`);
    }

    const { name, childName, childDob, childGender } = body;

    // Create family
    const family = await Family.create({
      name,
      members: [
        {
          userId,
          role: 'parent',
          joinedAt: new Date(),
        },
      ],
      childrenIds: [],
      createdBy: userId,
    });

    // Create first child
    const child = await Child.create({
      familyId: family._id,
      name: childName,
      dob: childDob ? new Date(childDob) : undefined,
      gender: childGender,
      createdBy: userId,
    });

    // Add child to family
    family.childrenIds.push(child._id);
    await family.save();

    console.log('✅ Family created:', family._id);
    console.log('✅ First child created:', child._id);

    return successResponse(
      {
        family,
        child,
      },
      'Family created successfully'
    );
  });
}

/**
 * GET /api/families
 * Get all families for the authenticated user
 */
export async function GET(request: NextRequest) {
  return withMiddleware(async () => {
    // Require authentication
    await requireAuth();
    const userId = await getCurrentUserId();

    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    // Find all families where user is a member
    const families = await Family.find({
      'members.userId': userId,
    })
      .populate('childrenIds')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(families);
  });
}
