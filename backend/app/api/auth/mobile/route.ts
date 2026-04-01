import { NextRequest } from 'next/server';
import { successResponse, errorResponse, withMiddleware } from '@/lib/utils/api-helpers';
import { generateMobileToken } from '@/lib/auth/session';
import { User } from '@/lib/db/models';
import { Types } from 'mongoose';

/**
 * POST /api/auth/mobile
 * Mobile authentication endpoint
 * Accepts OAuth provider token, validates with provider, creates/finds user, returns JWT
 */
export async function POST(request: NextRequest) {
  return withMiddleware(async () => {
    const body = await request.json();
    const { provider, token, email, name, avatar } = body;

    if (!provider || !email) {
      return errorResponse('Provider and email are required', 400);
    }

    if (!['google', 'apple'].includes(provider)) {
      return errorResponse('Invalid provider. Must be google or apple', 400);
    }

    // In production, validate the OAuth token with the provider here
    // For Google: verify with Google's tokeninfo endpoint
    // For Apple: verify the identity token

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        name: name || email.split('@')[0],
        avatar: avatar || undefined,
        authProvider: provider,
        providerAccountId: token || `${provider}_${Date.now()}`,
      });
    }

    // Generate JWT for mobile
    const jwtToken = generateMobileToken(
      (user._id as Types.ObjectId).toString(),
      user.email
    );

    return successResponse({
      token: jwtToken,
      user: {
        id: (user._id as Types.ObjectId).toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
      },
    });
  });
}
