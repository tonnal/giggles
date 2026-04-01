import { NextRequest } from 'next/server';
import { Storybook } from '@/lib/db/models';
import { IOrderStorybookRequest } from '@/lib/types';
import {
  successResponse,
  errorResponse,
  withMiddleware,
  validateRequired,
} from '@/lib/utils/api-helpers';

/**
 * POST /api/storybooks/[id]/order
 * Order a printed version of the storybook
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withMiddleware(async () => {
    const body: IOrderStorybookRequest = await request.json();

    const validation = validateRequired(body, [
      'printSize',
      'quantity',
      'shippingAddress',
    ]);
    if (!validation.valid) {
      return errorResponse(`Missing required fields: ${validation.missing?.join(', ')}`);
    }

    const { printSize, quantity, shippingAddress } = body;

    // Validate shipping address
    const addressValidation = validateRequired(shippingAddress, [
      'name',
      'street',
      'city',
      'state',
      'zipCode',
      'country',
    ]);
    if (!addressValidation.valid) {
      return errorResponse(
        `Missing address fields: ${addressValidation.missing?.join(', ')}`
      );
    }

    const { id } = await params;
    const storybook = await Storybook.findById(id);
    if (!storybook) {
      return errorResponse('Storybook not found', 404);
    }

    if (storybook.status === 'draft') {
      return errorResponse(
        'Storybook must be locked before ordering. Call /lock endpoint first.',
        400
      );
    }

    if (storybook.status === 'ordered' || storybook.status === 'shipped') {
      return errorResponse('Storybook already ordered', 400);
    }

    // Create order
    storybook.orderInfo = {
      orderedAt: new Date(),
      printSize,
      quantity,
      shippingAddress,
      status: 'processing',
    };

    storybook.status = 'ordered';
    await storybook.save();

    console.log('✅ Storybook order placed:', storybook._id);

    // TODO: Integrate with printing service API
    // TODO: Process payment
    // TODO: Send confirmation email

    return successResponse(
      {
        orderId: storybook._id,
        orderInfo: storybook.orderInfo,
      },
      'Order placed successfully'
    );
  });
}
