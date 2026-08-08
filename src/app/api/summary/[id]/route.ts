import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { userScope, requireUserId } from '@/lib/user';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const __uid = await requireUserId(req); if (!__uid) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await db.summary.delete({
      where: { id, ...(await userScope()) },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
