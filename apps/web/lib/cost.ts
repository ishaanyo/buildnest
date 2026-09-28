/**
 * Material + Labor cost calculator.
 * Prefer vision-model analysis from AICredits; fall back to heuristics.
 */

import type { RoomCostAnalysis } from './ai';

export type MaterialLine = {
  materialId: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type CostBreakdown = {
  materials: MaterialLine[];
  materialCost: number;
  laborCost: number;
  totalCost: number;
  assumptions: string[];
  analysis?: RoomCostAnalysis;
};

const DEFAULT_AREA: Record<string, number> = {
  bedroom: 14,
  living: 22,
  kitchen: 12,
  bathroom: 6,
  dining: 12,
  office: 10,
  plot: 80,
  other: 16,
};

/** Indian mid-market labor day rate (INR) — one skilled worker */
const LABOR_BASE_INR = {
  baseDaily: 1800, // ₹/day skilled labor (adjust per city)
  complexity: {
    simple: 1.0,
    medium: 1.35,
    complex: 1.9,
  } as Record<string, number>,
  daysByCategory: {
    flooring: 2,
    paint: 1.5,
    furniture: 0.5,
    lighting: 0.5,
    textiles: 0.3,
    wall: 1.5,
    kitchen: 3,
    decor: 0.2,
  } as Record<string, number>,
};

export function estimateArea(roomType?: string | null): number {
  if (!roomType) return DEFAULT_AREA.other;
  return DEFAULT_AREA[roomType.toLowerCase()] ?? DEFAULT_AREA.other;
}

type CatalogMaterial = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
};

export function calculateCosts(params: {
  roomType?: string | null;
  themeSlug?: string | null;
  materials: CatalogMaterial[];
  analysis?: RoomCostAnalysis | null;
}): CostBreakdown {
  const assumptions: string[] = [];
  const analysis = params.analysis;

  const area =
    analysis?.estimatedAreaSqm && analysis.estimatedAreaSqm > 0
      ? analysis.estimatedAreaSqm
      : estimateArea(params.roomType);

  if (analysis?.estimatedAreaSqm) {
    assumptions.push(`AI-estimated area ≈ ${area} sqm from room photo`);
  } else {
    assumptions.push(`Assumed room area ≈ ${area} sqm (no vision measurement)`);
  }

  const byCat = (cat: string) =>
    params.materials.filter((m) => m.category === cat);

  const lines: MaterialLine[] = [];
  const usedCategories = new Set<string>();

  // Prefer AI material hints when present
  if (analysis?.materialHints?.length) {
    for (const hint of analysis.materialHints) {
      const candidates = byCat(hint.category);
      if (!candidates.length) continue;
      const pick = candidates[0];
      const qty = Math.max(0.5, hint.suggestedQty);
      lines.push(line(pick, qty));
      usedCategories.add(hint.category);
    }
  }

  // Fill gaps with surface-based quantities
  const flooringSqm = analysis?.surfaces?.flooringSqm ?? area * 1.05;
  if (!usedCategories.has('flooring')) {
    const floor = byCat('flooring')[0];
    if (floor) {
      lines.push(line(floor, Math.ceil(flooringSqm)));
      usedCategories.add('flooring');
    }
  }

  const wallSqm = analysis?.surfaces?.wallPaintSqm ?? area * 2.8;
  if (!usedCategories.has('paint')) {
    const paint = byCat('paint')[0];
    if (paint) {
      const liters = Math.ceil(wallSqm / 10);
      lines.push(line(paint, liters));
      usedCategories.add('paint');
    }
  }

  // Theme / room furniture & finish extras
  if (!usedCategories.has('furniture')) {
    const furniture = byCat('furniture');
    if (furniture.length) {
      const picks =
        params.roomType === 'bedroom'
          ? furniture.filter((f) => f.sku.includes('BED')).slice(0, 1)
          : furniture.slice(0, 1);
      picks.forEach((f) => {
        lines.push(line(f, 1));
        usedCategories.add('furniture');
      });
    }
  }

  if (!usedCategories.has('lighting')) {
    const lighting = byCat('lighting')[0];
    if (lighting) {
      lines.push(line(lighting, 1));
      usedCategories.add('lighting');
    }
  }

  if (!usedCategories.has('textiles')) {
    byCat('textiles')
      .slice(0, 2)
      .forEach((t) => {
        lines.push(line(t, 1));
        usedCategories.add('textiles');
      });
  }

  if (!usedCategories.has('decor')) {
    const decor = byCat('decor')[0];
    if (decor) {
      lines.push(line(decor, 1));
      usedCategories.add('decor');
    }
  }

  if (params.roomType === 'kitchen' && !usedCategories.has('kitchen')) {
    const kit = byCat('kitchen')[0];
    if (kit) {
      lines.push(line(kit, 6));
      usedCategories.add('kitchen');
    }
  }

  const materialCost = round2(lines.reduce((s, l) => s + l.total, 0));

  // Labor
  let laborDays =
    analysis?.laborDaysEstimate && analysis.laborDaysEstimate > 0
      ? analysis.laborDaysEstimate
      : 0;

  if (!laborDays) {
    usedCategories.forEach((c) => {
      laborDays += LABOR_BASE_INR.daysByCategory[c] ?? 0.5;
    });
    laborDays = Math.max(laborDays, 1.5);
  }

  const complexityKey =
    analysis?.complexity ||
    (params.themeSlug === 'luxury' || params.themeSlug === 'japanese'
      ? 'complex'
      : 'medium');
  const complexityMult = LABOR_BASE_INR.complexity[complexityKey] ?? 1.35;

  const laborCost = round2(laborDays * LABOR_BASE_INR.baseDaily * complexityMult);
  assumptions.push(
    `Labor ≈ ${laborDays.toFixed(1)} worker-days × complexity ${complexityKey} (${complexityMult}×) @ ₹${LABOR_BASE_INR.baseDaily}/day`
  );
  if (analysis?.notes?.length) {
    assumptions.push(...analysis.notes);
  }

  return {
    materials: lines,
    materialCost,
    laborCost,
    totalCost: round2(materialCost + laborCost),
    assumptions,
    analysis: analysis ?? undefined,
  };
}

function line(
  m: CatalogMaterial,
  qty: number
): MaterialLine {
  return {
    materialId: m.id,
    sku: m.sku,
    name: m.name,
    category: m.category,
    unit: m.unit,
    quantity: qty,
    unitPrice: m.unitPrice,
    total: round2(qty * m.unitPrice),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
