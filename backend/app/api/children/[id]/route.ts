import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { Child, Family } from '@/lib/db/models';
import {
  successResponse,
  errorResponse,
  withMiddleware,
} from '@/lib/utils/api-helpers';
import { requireAuth, getCurrentUserId } from '@/lib/auth/session';

/**
 * Helper to verify user has access to a child's family
 */
async function verifyChildAccess(childId: string, userId: Types.ObjectId) {
  const child = await Child.findById(childId);
  if (!child) {
    return { error: errorResponse('Child not found', 404), child: null };
  }

  const family = await Family.findById(child.familyId);
  if (!family) {
    return { error: errorResponse('Family not found', 404), child: null };
  }

  const isMember = family.members.some((member) => member.userId.equals(userId));
  if (!isMember) {
    return { error: errorResponse('You do not have access to this child', 403), child: null };
  }

  return { error: null, child };
}

/**
 * GET /api/children/[id]
 * Get a specific child's details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMiddleware(async () => {
    await requireAuth();
    const userId = await getCurrentUserId();

    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await params;
    const { error, child } = await verifyChildAccess(id, userId);

    if (error) return error;

    return successResponse(child);
  });
}

/**
 * PATCH /api/children/[id]
 * Update a child's profile
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMiddleware(async () => {
    await requireAuth();
    const userId = await getCurrentUserId();

    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await params;
    const { error, child } = await verifyChildAccess(id, userId);

    if (error) return error;
    if (!child) return errorResponse('Child not found', 404);

    const body = await request.json();
    const { name, dob, gender, photoUrl } = body;

    // Update fields if provided
    if (name) child.name = name;
    if (dob) child.dob = new Date(dob);
    if (gender) child.gender = gender;
    if (photoUrl !== undefined) child.photoUrl = photoUrl;

    await child.save();

    console.log('✅ Child updated:', child._id);

    return successResponse(child, 'Child profile updated successfully');
  });
}

/**
 * DELETE /api/children/[id]
 * Delete a child profile
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMiddleware(async () => {
    await requireAuth();
    const userId = await getCurrentUserId();

    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = await params;
    const { error, child } = await verifyChildAccess(id, userId);

    if (error) return error;
    if (!child) return errorResponse('Child not found', 404);

    // Remove child from family's childrenIds
    await Family.updateOne(
      { _id: child.familyId },
      { $pull: { childrenIds: child._id } }
    );

    // Delete child
    await Child.deleteOne({ _id: child._id });

    console.log('✅ Child deleted:', child._id);

    return successResponse(null, 'Child profile deleted successfully');
  });
}
