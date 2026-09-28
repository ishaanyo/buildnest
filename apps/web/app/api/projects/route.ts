import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  generateRoomDesign,
  generateRoomDesignFromPhoto,
  analyzeRoomForCosts,
} from '@/lib/ai';
import { calculateCosts } from '@/lib/cost';
import { z } from 'zod';

const CreateSchema = z.object({
  sourceImageUrl: z.string().url(),
  themeId: z.string().optional(),
  themeSlug: z.string().optional(),
  roomType: z.string().optional(),
  userId: z.string().optional(),
  /** Prefer photo-conditioned redesign when true (uses multimodal edit model) */
  usePhotoReference: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = CreateSchema.parse(body);

    let theme = null;
    if (data.themeId) {
      theme = await prisma.theme.findUnique({ where: { id: data.themeId } });
    } else if (data.themeSlug) {
      theme = await prisma.theme.findUnique({ where: { slug: data.themeSlug } });
    }

    if (!theme) {
      return NextResponse.json({ error: 'Theme required' }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        sourceImageUrl: data.sourceImageUrl,
        themeId: theme.id,
        roomType: data.roomType,
        userId: data.userId,
        status: 'PROCESSING',
      },
    });

    // 1) Vision analysis for costs (parallel-friendly)
    const analysisPromise = analyzeRoomForCosts({
      imageUrl: data.sourceImageUrl,
      roomType: data.roomType,
      themeSlug: theme.slug,
    });

    // 2) Image generation
    let images: string[] = [];
    let provider = 'unknown';
    try {
      const genFn = data.usePhotoReference
        ? generateRoomDesignFromPhoto
        : generateRoomDesign;

      const result = await genFn({
        imageUrl: data.sourceImageUrl,
        themePrompt: theme.prompt,
        themeName: theme.name,
        roomType: data.roomType,
      });
      images = result.images;
      provider = result.provider;
    } catch (aiErr: any) {
      console.error('[ai]', aiErr);
      await prisma.project.update({
        where: { id: project.id },
        data: { status: 'FAILED', notes: aiErr.message },
      });
      return NextResponse.json(
        { error: 'AI generation failed', detail: aiErr.message },
        { status: 502 }
      );
    }

    const analysis = await analysisPromise;
    const materials = await prisma.material.findMany({ where: { isActive: true } });
    const costs = calculateCosts({
      roomType: data.roomType,
      themeSlug: theme.slug,
      materials,
      analysis,
    });

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        resultImageUrls: images,
        status: 'COMPLETED',
        materialCost: costs.materialCost,
        laborCost: costs.laborCost,
        totalCost: costs.totalCost,
        materialBreakdown: costs.materials,
        notes: [`provider:${provider}`, ...costs.assumptions].join(' | '),
      },
      include: { theme: true },
    });

    return NextResponse.json({ project: updated, costs, analysis });
  } catch (e: any) {
    console.error(e);
    if (e.name === 'ZodError') {
      return NextResponse.json({ error: e.errors }, { status: 400 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      const project = await prisma.project.findUnique({
        where: { id },
        include: { theme: true },
      });
      if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ project });
    }

    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { theme: true },
    });
    return NextResponse.json({ projects });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
