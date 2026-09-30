/**
 * AICredits integration for BuildNest
 * Base: https://api.aicredits.in/v1
 *
 * Defaults (cheap):
 * - Image: black-forest-labs/flux-1-schnell (~₹0.20/img)
 * - Vision: google/gemini-2.0-flash
 */

const AICREDITS_BASE = process.env.AICREDITS_BASE_URL || 'https://api.aicredits.in/v1';
const AICREDITS_KEY = process.env.AICREDITS_API_KEY || '';

// Cheap defaults
const DEFAULT_IMAGE_MODEL = 'black-forest-labs/flux-1-schnell';
const DEFAULT_VISION_MODEL = 'google/gemini-2.0-flash';

export type GenerateRoomInput = {
  imageUrl: string;
  themePrompt: string;
  themeName?: string;
  roomType?: string;
};

export type GenerateRoomResult = {
  images: string[];
  provider: string;
  analysis?: string;
  raw?: unknown;
  error?: string;
};

export type RoomCostAnalysis = {
  estimatedAreaSqm: number;
  surfaces: {
    flooringSqm?: number;
    wallPaintSqm?: number;
    ceilingSqm?: number;
  };
  recommendedCategories: string[];
  complexity: 'simple' | 'medium' | 'complex';
  laborDaysEstimate: number;
  notes: string[];
  materialHints: Array<{
    category: string;
    suggestedQty: number;
    unit: string;
    reason: string;
  }>;
};

async function aicreditsFetch(path: string, body: unknown) {
  if (!AICREDITS_KEY) {
    throw new Error('AICREDITS_API_KEY is not set');
  }
  const res = await fetch(`${AICREDITS_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AICREDITS_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AICredits ${res.status}: ${errText}`);
  }
  return res.json();
}

function isPlot(roomType?: string) {
  const t = (roomType || '').toLowerCase();
  return t === 'plot' || t === 'floorplan' || t === 'floor_plan' || t === 'site';
}

/** Build prompts: for plot → multiple whole-home 3D views; for room → interior views */
function buildPrompts(input: GenerateRoomInput): string[] {
  const theme = input.themePrompt;
  const styleTail =
    'Photorealistic architectural visualization, 3D render, high detail, natural lighting, no people, no text, no watermark, 8k.';

  if (isPlot(input.roomType)) {
    // Multiple views of the whole plot / house so user sees full design, not one room crop
    return [
      `${theme} 3D exterior aerial view of a complete residential house on a plot, landscaped garden, driveway, realistic materials. ${styleTail}`,
      `${theme} 3D cutaway interior of the whole home showing living, dining and kitchen open plan from the plot layout. ${styleTail}`,
      `${theme} 3D living room interior of the house designed from the plot plan, wide angle, furnished. ${styleTail}`,
      `${theme} 3D master bedroom interior matching the plot design theme, furnished, soft light. ${styleTail}`,
    ];
  }

  const room = input.roomType || 'living room';
  return [
    `${theme} Photorealistic ${room} interior redesign, wide angle, fully furnished. ${styleTail}`,
    `${theme} Alternate camera angle of the same ${room}, different lighting, photorealistic. ${styleTail}`,
    `${theme} Detail view of the ${room} seating / focal wall, same design language. ${styleTail}`,
  ];
}

/**
 * Analyze room/plot photo with cheap vision model → cost inputs.
 */
export async function analyzeRoomForCosts(input: {
  imageUrl: string;
  roomType?: string;
  themeSlug?: string;
}): Promise<RoomCostAnalysis> {
  const visionModel = process.env.AICREDITS_VISION_MODEL || DEFAULT_VISION_MODEL;

  const plotHint = isPlot(input.roomType)
    ? 'This is a PLOT / FLOOR PLAN image. Estimate total built-up area of the whole house, not a single room.'
    : 'Analyze this single room photo.';

  const system = `You are an expert interior estimator for Indian residential projects.
${plotHint}
Return ONLY valid JSON (no markdown):
{
  "estimatedAreaSqm": number,
  "surfaces": { "flooringSqm": number, "wallPaintSqm": number, "ceilingSqm": number },
  "recommendedCategories": string[],
  "complexity": "simple" | "medium" | "complex",
  "laborDaysEstimate": number,
  "notes": string[],
  "materialHints": [{ "category": string, "suggestedQty": number, "unit": string, "reason": string }]
}
Categories from: flooring, paint, furniture, lighting, textiles, wall, kitchen, decor.
Be realistic for Indian mid-market costs.`;

  try {
    const data = await aicreditsFetch('/chat/completions', {
      model: visionModel,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Room type: ${input.roomType || 'unknown'}. Theme: ${input.themeSlug || 'general'}. Estimate area, surfaces, materials and labor.`,
            },
            { type: 'image_url', image_url: { url: input.imageUrl } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    });

    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content) as RoomCostAnalysis;
    return {
      estimatedAreaSqm: parsed.estimatedAreaSqm ?? (isPlot(input.roomType) ? 80 : 16),
      surfaces: parsed.surfaces ?? {},
      recommendedCategories:
        parsed.recommendedCategories ?? ['flooring', 'paint', 'lighting', 'furniture'],
      complexity: parsed.complexity ?? 'medium',
      laborDaysEstimate: parsed.laborDaysEstimate ?? (isPlot(input.roomType) ? 12 : 3.5),
      notes: parsed.notes ?? [],
      materialHints: parsed.materialHints ?? [],
    };
  } catch (e) {
    console.warn('[ai] vision analysis failed, using defaults', e);
    const area = isPlot(input.roomType) ? 80 : 16;
    return {
      estimatedAreaSqm: area,
      surfaces: { flooringSqm: area, wallPaintSqm: area * 2.8, ceilingSqm: area },
      recommendedCategories: ['flooring', 'paint', 'furniture', 'lighting', 'textiles'],
      complexity: isPlot(input.roomType) ? 'complex' : 'medium',
      laborDaysEstimate: isPlot(input.roomType) ? 12 : 3.5,
      notes: ['Vision analysis unavailable — used default heuristics'],
      materialHints: [],
    };
  }
}

async function generateOneImage(prompt: string, model: string): Promise<string | null> {
  const body: Record<string, unknown> = {
    model,
    prompt: prompt.slice(0, 3900),
    n: 1,
    size: '1024x1024',
    response_format: 'url',
  };
  if (model.includes('dall-e')) {
    body.quality = 'standard';
    body.style = 'natural';
  }
  const data = await aicreditsFetch('/images/generations', body);
  const url = data.data?.[0]?.url;
  return typeof url === 'string' ? url : null;
}

/**
 * Generate multiple interior / plot 3D renders using cheap Flux Schnell.
 * Plot → 4 views (exterior + whole home + living + bedroom).
 * Room → 3 alternate angles.
 */
export async function generateRoomDesign(
  input: GenerateRoomInput
): Promise<GenerateRoomResult> {
  if (!AICREDITS_KEY) {
    console.warn('[ai] No AICREDITS_API_KEY — using mock images');
    return mockResult('mock');
  }

  const imageModel = process.env.AICREDITS_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
  const prompts = buildPrompts(input);
  const images: string[] = [];
  const errors: string[] = [];

  // Run sequential to avoid burst rate limits on free/low budget keys
  for (const prompt of prompts) {
    try {
      const url = await generateOneImage(prompt, imageModel);
      if (url) images.push(url);
    } catch (e: any) {
      errors.push(e.message || String(e));
      // Budget exceeded — stop spending more calls
      if (String(e.message).includes('402') || String(e.message).includes('Budget')) {
        break;
      }
    }
  }

  // One cheap fallback model if primary produced nothing
  if (images.length === 0) {
    try {
      const url = await generateOneImage(prompts[0], 'black-forest-labs/flux-1-schnell');
      if (url) images.push(url);
    } catch (e: any) {
      errors.push(e.message || String(e));
    }
  }

  if (images.length === 0) {
    const err = errors.join(' | ') || 'unknown';
    console.error('[ai] all image generation failed', err);
    return {
      ...mockResult('mock-fallback'),
      error: err,
      analysis: err,
    };
  }

  return {
    images,
    provider: `aicredits:${imageModel}`,
    analysis: errors.length ? errors.join(' | ') : undefined,
  };
}

/**
 * Photo-conditioned path: still uses multi-prompt text-to-image for reliability/cost.
 * (True img2img models on AICredits are limited; multi view text prompts work better for plots.)
 */
export async function generateRoomDesignFromPhoto(
  input: GenerateRoomInput
): Promise<GenerateRoomResult> {
  // Prefer multi-view text generation (cheaper + multiple images)
  return generateRoomDesign(input);
}

function mockResult(provider: string): GenerateRoomResult {
  return {
    images: [
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=80',
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80',
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80',
    ],
    provider,
  };
}
