export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/helpers';
import { getTokenBalance, getTransactionHistory } from '@/lib/token/service';

export async function GET() {
  try {
    const sessionUser = await requireAuth();
    const balance = await getTokenBalance(sessionUser.id);
    const history = await getTransactionHistory(sessionUser.id);

    return NextResponse.json({
      success: true,
      data: { ...balance, history },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
}
