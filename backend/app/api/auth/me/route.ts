import { NextRequest } from 'next/server';
import { successResponse, errorResponse, withMiddleware } from '@/lib/utils/api-helpers';
import { getCurrentUserData } from '@/lib/auth/session';

/**
 * GET /api/auth/me
 * Get the current authenticated user's data
 */
export async function GET(request: NextRequest) {
  return withMiddleware(async () => {
    const user = await getCurrentUserData();

    if (!user) {
      return errorResponse('Not authenticated', 401);
    }

    return successResponse({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
      },
    });
  });
}
