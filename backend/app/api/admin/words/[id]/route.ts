import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/supabase-server';
import { supabaseAdmin } from '../../../../../lib/supabase-admin';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.isActive !== 'boolean') {
    return NextResponse.json({ error: 'isActive(boolean)가 필요합니다.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin().from('words').update({ is_active: body.isActive }).eq('id', id);
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
