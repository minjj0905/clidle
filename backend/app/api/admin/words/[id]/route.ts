import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/supabase-server';
import { supabaseAdmin } from '../../../../../lib/supabase-admin';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const patch: { is_active?: boolean; is_answer_pool?: boolean } = {};
  if (typeof body?.isActive === 'boolean') patch.is_active = body.isActive;
  if (typeof body?.isAnswerPool === 'boolean') patch.is_answer_pool = body.isAnswerPool;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'isActive 또는 isAnswerPool(boolean)이 필요합니다.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin().from('words').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });

  const { id } = await params;
  const { error } = await supabaseAdmin().from('words').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
