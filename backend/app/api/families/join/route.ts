import { NextRequest } from 'next/server';
import { Types } from 'mongoose';
import { Family } from '@/lib/db/models';
import { IJoinFamilyRequest } from '@/lib/types';
import {
  successResponse,
  errorResponse,
  withMiddleware,
  validateRequired,
} from '@/lib/utils/api-helpers';

/**
 * POST /api/families/join
 * Join a family using invite code
 */
export async function POST(request: NextRequest) {
  return withMiddleware(async () => {
    const body: IJoinFamilyRequest = await request.json();

    // Validate
    const validation = validateRequired(body, ['inviteCode']);
    if (!validation.valid) {
      return errorResponse('Invite code is required');
    }

    const { inviteCode } = body;

    // TODO: Get actual user ID from auth
    const userId = new Types.ObjectId(); // Placeholder

    // Find family by invite code
    const family = await Family.findOne({ inviteCode });
    if (!family) {
      return errorResponse('Invalid invite code', 404);
    }

    // Check if user is already a member
    const alreadyMember = family.members.some(
      (member) => member.userId.toString() === userId.toString()
    );

    if (alreadyMember) {
      return errorResponse('You are already a member of this family', 400);
    }

    // Add user to family members
    family.members.push({
      userId,
      role: 'relative', // Default role, can be updated later
      joinedAt: new Date(),
    });

    await family.save();

    console.log('✅ User joined family:', {
      userId,
      familyId: family._id,
    });

    return successResponse(family, 'Successfully joined family');
  });
}
