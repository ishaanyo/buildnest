import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const OrderSchema = z.object({
  projectId: z.string(),
  includeLabor: z.boolean().default(true),
  userId: z.string().optional(),
  shippingAddress: z.record(z.any()).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = OrderSchema.parse(body);

    const project = await prisma.project.findUnique({ where: { id: data.projectId } });
    if (!project || project.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Project not ready' }, { status: 400 });
    }

    const materialTotal = project.materialCost ?? 0;
    const laborTotal = data.includeLabor ? project.laborCost ?? 0 : 0;
    const packageTotal = materialTotal + laborTotal;

    const breakdown = (project.materialBreakdown as any[]) || [];

    const order = await prisma.order.create({
      data: {
        projectId: project.id,
        userId: data.userId,
        materialTotal,
        laborTotal,
        packageTotal,
        includeLabor: data.includeLabor,
        shippingAddress: data.shippingAddress,
        status: 'PENDING',
        items: {
          create: breakdown.map((line) => ({
            materialId: line.materialId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            total: line.total,
          })),
        },
      },
      include: { items: { include: { material: true } }, project: true },
    });

    return NextResponse.json({ order });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (id) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { material: true } }, project: true },
    });
    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ order });
  }
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { project: true },
  });
  return NextResponse.json({ orders });
}
