import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { authOptions } from './auth-config';
import { User } from '@/lib/db/models';
import { Types } from 'mongoose';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'giggles-dev-secret';

/**
 * Generate a mobile JWT token for a user
 */
export function generateMobileToken(userId: string, email: string): string {
  return jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '30d' });
}

/**
 * Verify a mobile JWT token
 */
function verifyMobileToken(token: string): { id: string; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string };
  } catch {
    return null;
  }
}

/**
 * Try to get user from Bearer token (mobile auth)
 */
async function getUserFromBearerToken(): Promise<{ id: string; email: string; name: string; image?: string } | null> {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const payload = verifyMobileToken(token);

  if (!payload) {
    return null;
  }

  const user = await User.findById(payload.id).lean();
  if (!user) {
    return null;
  }

  return {
    id: (user._id as Types.ObjectId).toString(),
    email: user.email,
    name: user.name,
    image: user.avatar,
  };
}

/**
 * Get the current authenticated user session
 * Supports both NextAuth sessions (web) and Bearer tokens (mobile)
 */
export async function getCurrentUser() {
  // Try NextAuth session first (web)
  const session = await getServerSession(authOptions);
  if (session?.user) {
    return session.user;
  }

  // Fall back to Bearer token (mobile)
  return getUserFromBearerToken();
}

/**
 * Get the current user's full data from database
 */
export async function getCurrentUserData() {
  const user = await getCurrentUser();

  if (!user || !('id' in user)) {
    return null;
  }

  const userData = await User.findById(user.id).lean();
  return userData;
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized - Please sign in');
  }

  return user;
}

/**
 * Get user ID from session
 */
export async function getCurrentUserId(): Promise<Types.ObjectId | null> {
  const user = await getCurrentUser();

  if (!user || !('id' in user)) {
    return null;
  }

  return new Types.ObjectId(user.id as string);
}
