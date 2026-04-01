import { NextRequest, NextResponse } from 'next/server';
import { IApiResponse } from '@/lib/types';
import connectDB from '@/lib/db/mongoose';

/**
 * API Response Helpers
 */

export function successResponse<T>(data: T, message?: string): NextResponse<IApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
  });
}

export function errorResponse(error: string, status: number = 400): NextResponse<IApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

/**
 * Database Connection Middleware
 * Ensures MongoDB is connected before handling requests
 */
export async function withDB<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T>> {
  try {
    await connectDB();
    return await handler();
  } catch (error: any) {
    console.error('Database connection error:', error);
    return errorResponse('Database connection failed', 500) as any;
  }
}

/**
 * Error Handler Wrapper
 * Catches errors and returns proper error responses
 */
export function withErrorHandler<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T>> {
  return handler().catch((error: any) => {
    console.error('API Error:', error);

    if (error.name === 'ValidationError') {
      return errorResponse(error.message, 400) as any;
    }

    if (error.name === 'CastError') {
      return errorResponse('Invalid ID format', 400) as any;
    }

    return errorResponse(error.message || 'Internal server error', 500) as any;
  });
}

/**
 * Combined middleware: DB connection + Error handling
 */
export async function withMiddleware<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T>> {
  return withDB(() => withErrorHandler(handler));
}

/**
 * Get user ID from request (placeholder for auth)
 * In production, this would extract from JWT or session
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  // TODO: Implement proper authentication
  // For now, return a placeholder or from headers
  const userId = request.headers.get('x-user-id');
  return userId;
}

/**
 * Validate required fields in request body
 */
export function validateRequired(
  data: any,
  fields: string[]
): { valid: boolean; missing?: string[] } {
  const missing = fields.filter((field) => !data[field]);

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return { valid: true };
}

/**
 * Parse pagination params from URL
 */
export function getPaginationParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
