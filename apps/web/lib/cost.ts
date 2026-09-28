/**
 * Material + Labor cost calculator.
 * Rules are intentionally simple and data-driven so you can refine later.
 */

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
};

// Rough room area heuristics (sqm) by room type when we don't have measurements
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

// Labor rates (currency units per day / complexity multiplier)
const LABOR_BASE = {
  baseDaily: 180, // one skilled worker day
  complexity: {
    simple: 1.0,
    medium: 1.4,
    complex: 2.0,
  },
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

/**
 * Given a theme + room type + catalog materials, produce a plausible bill of materials.
 * In production you would use vision / LLM to detect surfaces and recommend exact SKUs.
 */
export function calculateCosts(params: {
  roomType?: string | null;
  themeSlug?: string | null;
  materials: Array<{
    id: string;
    sku: string;
    name: string;
    category: string;
    unit: string;
    unitPrice: number;
  }>;
}): CostBreakdown {
  const area = estimateArea(params.roomType);
  const assumptions: string[] = [
    `Assumed room area ≈ ${area} sqm (no measurements provided)`,
  ];

  const byCat = (cat: string) =>
    params.materials.filter((m) => m.category === cat);

  const lines: MaterialLine[] = [];

  // Flooring
  const floor = byCat('flooring')[0];
  if (floor) {
    const qty = Math.ceil(area * 1.05); // 5% waste
    lines.push(line(floor, qty));
  }

  // Paint (walls + ceiling rough)
  const paint = byCat('paint')[0];
  if (paint) {
    const wallArea = area * 2.8; // rough
    const liters = Math.ceil(wallArea / 10); // ~10 sqm per liter
    lines.push(line(paint, liters));
  }

  // Furniture / lighting / textiles — theme-aware light selection
  const furniture = byCat('furniture');
  if (furniture.length) {
    // pick 1–2 items based on room
    const picks =
      params.roomType === 'bedroom'
        ? furniture.filter((f) => f.sku.includes('BED')).slice(0, 1)
        : furniture.slice(0, 1);
    picks.forEach((f) => lines.push(line(f, 1)));
  }

  const lighting = byCat('lighting')[0];
  if (lighting) lines.push(line(lighting, 1));

  const textiles = byCat('textiles');
  textiles.slice(0, 2).forEach((t) => lines.push(line(t, 1)));

  const decor = byCat('decor')[0];
  if (decor) lines.push(line(decor, 1));

  if (params.roomType === 'kitchen') {
    const kit = byCat('kitchen')[0];
    if (kit) lines.push(line(kit, 6)); // 6 modules
  }

  const materialCost = round2(lines.reduce((s, l) => s + l.total, 0));

  // Labor: sum days by categories present
  let laborDays = 0;
  const cats = new Set(lines.map((l) => l.category));
  cats.forEach((c) => {
    laborDays += LABOR_BASE.daysByCategory[c] ?? 0.5;
  });
  laborDays = Math.max(laborDays, 1.5);
  const complexity =
    params.themeSlug === 'luxury' || params.themeSlug === 'japanese'
      ? LABOR_BASE.complexity.complex
      : LABOR_BASE.complexity.medium;

  const laborCost = round2(laborDays * LABOR_BASE.baseDaily * complexity);
  assumptions.push(
    `Labor ≈ ${laborDays.toFixed(1)} worker-days × complexity ${complexity}`
  );

  return {
    materials: lines,
    materialCost,
    laborCost,
    totalCost: round2(materialCost + laborCost),
    assumptions,
  };
}

function line(
  m: { id: string; sku: string; name: string; category: string; unit: string; unitPrice: number },
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
