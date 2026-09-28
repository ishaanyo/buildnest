import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }

    const blob = await put(`uploads/${Date.now()}-${file.name}`, file, {
      access: 'public',
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (e: any) {
    // Fallback when BLOB token missing — return a placeholder
    console.warn('[upload]', e.message);
    return NextResponse.json({
      url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80',
      note: 'Blob storage not configured — using placeholder',
    });
  }
}
