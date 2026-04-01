import { Types } from 'mongoose';
import { Family } from '@/lib/db/models';
import { errorResponse } from './api-helpers';

/**
 * Helper to verify user has access to a family
 */
export async function verifyFamilyAccess(familyId: string, userId: Types.ObjectId) {
  const family = await Family.findById(familyId);

  if (!family) {
    return { error: errorResponse('Family not found', 404), family: null };
  }

  const isMember = family.members.some((member) => member.userId.equals(userId));

  if (!isMember) {
    return { error: errorResponse('You do not have access to this family', 403), family: null };
  }

  return { error: null, family };
}
