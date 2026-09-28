import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const themes = [
  {
    slug: 'modern',
    name: 'Modern',
    description: 'Clean lines, neutral palette, contemporary furniture',
    prompt:
      'Transform this room into a modern interior design. Clean geometric lines, neutral colors (whites, grays, black accents), minimal clutter, contemporary furniture, large windows feel, polished surfaces, soft ambient lighting. Photorealistic, high detail, architectural photography style.',
    sortOrder: 1,
  },
  {
    slug: 'minimalist',
    name: 'Minimalist',
    description: 'Less is more — open space, essential pieces only',
    prompt:
      'Redesign this room in pure minimalist style. Extremely clean, white and light wood, only essential furniture, maximum empty space, soft natural light, no decoration clutter, zen atmosphere, Japanese-inspired simplicity. Photorealistic interior render.',
    sortOrder: 2,
  },
  {
    slug: 'luxury',
    name: 'Luxury',
    description: 'Opulent materials, rich textures, high-end finishes',
    prompt:
      'Transform into a luxury interior. Marble floors or accents, velvet or leather upholstery, gold/brass fixtures, crystal lighting, rich dark woods, elegant drapery, high-end designer furniture, sophisticated color palette. Photorealistic luxury interior photography.',
    sortOrder: 3,
  },
  {
    slug: 'scandinavian',
    name: 'Scandinavian',
    description: 'Light woods, hygge comfort, functional beauty',
    prompt:
      'Scandinavian interior design. Light oak or birch wood, white walls, cozy textiles, functional furniture, plants, soft natural light, hygge atmosphere, muted pastel accents, clean and airy. Photorealistic Nordic home style.',
    sortOrder: 4,
  },
  {
    slug: 'industrial',
    name: 'Industrial',
    description: 'Exposed brick, metal, raw materials',
    prompt:
      'Industrial loft style interior. Exposed brick walls, black metal frames, concrete floors, vintage leather, Edison bulb lighting, reclaimed wood, open ducts aesthetic, urban warehouse feel. Photorealistic industrial interior.',
    sortOrder: 5,
  },
  {
    slug: 'boho',
    name: 'Bohemian',
    description: 'Eclectic, layered textiles, warm colors',
    prompt:
      'Bohemian / Boho chic interior. Layered rugs, macramé, plants everywhere, warm terracotta and jewel tones, mix of patterns, rattan furniture, global textiles, cozy and artistic. Photorealistic boho room design.',
    sortOrder: 6,
  },
  {
    slug: 'japanese',
    name: 'Japanese Zen',
    description: 'Wabi-sabi, natural materials, calm',
    prompt:
      'Japanese Zen interior. Tatami or light wood floors, shoji screens feel, low furniture, natural materials, bonsai or simple greenery, soft diffused light, wabi-sabi aesthetic, calm and balanced. Photorealistic Japanese interior design.',
    sortOrder: 7,
  },
  {
    slug: 'coastal',
    name: 'Coastal',
    description: 'Beach house vibes, light blues and whites',
    prompt:
      'Coastal / beach house interior. Light blues, sandy neutrals, white washed wood, linen fabrics, rattan, ocean-inspired accents, bright natural light, relaxed vacation home feeling. Photorealistic coastal interior.',
    sortOrder: 8,
  },
];

// Prices in INR (mid-market India)
const materials = [
  { sku: 'FLR-OAK-01', name: 'Premium Oak Flooring', category: 'flooring', unit: 'sqm', unitPrice: 3200, description: 'Engineered oak, 14mm' },
  { sku: 'FLR-TILE-01', name: 'Porcelain Floor Tile', category: 'flooring', unit: 'sqm', unitPrice: 950, description: '60x60cm matte porcelain' },
  { sku: 'PNT-MAT-01', name: 'Interior Matte Paint', category: 'paint', unit: 'liter', unitPrice: 450, description: 'Premium washable matte' },
  { sku: 'PNT-ACR-01', name: 'Accent Wall Paint', category: 'paint', unit: 'liter', unitPrice: 650, description: 'Designer accent colors' },
  { sku: 'FUR-SOFA-01', name: 'Modern 3-Seater Sofa', category: 'furniture', unit: 'piece', unitPrice: 45000, description: 'Fabric sofa, various colors' },
  { sku: 'FUR-BED-01', name: 'Platform Bed Frame Queen', category: 'furniture', unit: 'piece', unitPrice: 28000, description: 'Solid wood platform' },
  { sku: 'FUR-TBL-01', name: 'Dining Table 6-seater', category: 'furniture', unit: 'piece', unitPrice: 35000, description: 'Oak dining table' },
  { sku: 'LIT-PEND-01', name: 'Pendant Light Set', category: 'lighting', unit: 'set', unitPrice: 6500, description: '3-piece modern pendant' },
  { sku: 'LIT-REC-01', name: 'Recessed LED Kit', category: 'lighting', unit: 'set', unitPrice: 4200, description: '6x dimmable recessed lights' },
  { sku: 'TEX-RUG-01', name: 'Area Rug 2x3m', category: 'textiles', unit: 'piece', unitPrice: 8500, description: 'Wool blend area rug' },
  { sku: 'TEX-CUR-01', name: 'Blackout Curtains Pair', category: 'textiles', unit: 'set', unitPrice: 5500, description: 'Floor-length blackout' },
  { sku: 'DEC-PLT-01', name: 'Indoor Plant Package', category: 'decor', unit: 'set', unitPrice: 2500, description: '3 medium plants + pots' },
  { sku: 'WAL-ACC-01', name: 'Feature Wall Panel', category: 'wall', unit: 'sqm', unitPrice: 2800, description: 'Acoustic / decorative panel' },
  { sku: 'KIT-CAB-01', name: 'Kitchen Cabinet Module', category: 'kitchen', unit: 'unit', unitPrice: 12000, description: 'Base or wall cabinet unit' },
];

async function main() {
  console.log('Seeding themes...');
  for (const t of themes) {
    await prisma.theme.upsert({
      where: { slug: t.slug },
      update: t,
      create: t,
    });
  }

  console.log('Seeding materials (INR)...');
  for (const m of materials) {
    await prisma.material.upsert({
      where: { sku: m.sku },
      update: m,
      create: m,
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
