export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { claimDailyBonus } from '@/lib/token/service';

export async function POST() {
  try {
    const sessionUser = await requireAuth();
    const result = await claimDailyBonus(sessionUser.id);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
}
