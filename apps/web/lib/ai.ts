/**
 * AICredits integration for BuildNest
 * Base: https://api.aicredits.in/v1  (OpenAI-compatible)
 *
 * Models used:
 * - Image gen: black-forest-labs/flux-1.1-pro (photoreal interiors) or dall-e-3
 * - Vision / cost analysis: openai/gpt-4o-mini or google/gemini-2.0-flash
 */

const AICREDITS_BASE = process.env.AICREDITS_BASE_URL || 'https://api.aicredits.in/v1';
const AICREDITS_KEY = process.env.AICREDITS_API_KEY || '';

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

/**
 * Analyze room photo with vision model → structured cost inputs.
 */
export async function analyzeRoomForCosts(input: {
  imageUrl: string;
  roomType?: string;
  themeSlug?: string;
}): Promise<RoomCostAnalysis> {
  const visionModel =
    process.env.AICREDITS_VISION_MODEL || 'openai/gpt-4o-mini';

  const system = `You are an expert interior estimator for Indian residential projects.
Analyze the room photo and return ONLY valid JSON (no markdown) matching this schema:
{
  "estimatedAreaSqm": number,
  "surfaces": { "flooringSqm": number, "wallPaintSqm": number, "ceilingSqm": number },
  "recommendedCategories": string[],
  "complexity": "simple" | "medium" | "complex",
  "laborDaysEstimate": number,
  "notes": string[],
  "materialHints": [{ "category": string, "suggestedQty": number, "unit": string, "reason": string }]
}
Categories must be from: flooring, paint, furniture, lighting, textiles, wall, kitchen, decor.
Be realistic for Indian mid-market residential costs. If plot map (not a furnished room), treat as empty space planning.`;

  const userContent: any[] = [
    {
      type: 'text',
      text: `Room type: ${input.roomType || 'unknown'}. Theme: ${input.themeSlug || 'general'}.
Estimate area, surfaces, material quantities and labor complexity from this image.`,
    },
    {
      type: 'image_url',
      image_url: { url: input.imageUrl },
    },
  ];

  try {
    const data = await aicreditsFetch('/chat/completions', {
      model: visionModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    });

    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content) as RoomCostAnalysis;
    return {
      estimatedAreaSqm: parsed.estimatedAreaSqm ?? 16,
      surfaces: parsed.surfaces ?? {},
      recommendedCategories: parsed.recommendedCategories ?? ['flooring', 'paint', 'lighting'],
      complexity: parsed.complexity ?? 'medium',
      laborDaysEstimate: parsed.laborDaysEstimate ?? 3,
      notes: parsed.notes ?? [],
      materialHints: parsed.materialHints ?? [],
    };
  } catch (e) {
    console.warn('[ai] vision analysis failed, using defaults', e);
    return {
      estimatedAreaSqm: 16,
      surfaces: { flooringSqm: 16, wallPaintSqm: 45, ceilingSqm: 16 },
      recommendedCategories: ['flooring', 'paint', 'furniture', 'lighting', 'textiles'],
      complexity: 'medium',
      laborDaysEstimate: 3.5,
      notes: ['Vision analysis unavailable — used default room heuristics'],
      materialHints: [],
    };
  }
}

/**
 * Generate interior design image(s) from theme prompt + optional room context.
 * Uses Flux 1.1 Pro (photoreal) via Images API; falls back to DALL-E 3.
 */
export async function generateRoomDesign(
  input: GenerateRoomInput
): Promise<GenerateRoomResult> {
  if (!AICREDITS_KEY) {
    console.warn('[ai] No AICREDITS_API_KEY — using mock images');
    return {
      images: [
        'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=80',
        'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80',
      ],
      provider: 'mock',
    };
  }

  // Enrich prompt with room type + theme for photoreal interior
  const fullPrompt = [
    input.themePrompt,
    input.roomType ? `Room type: ${input.roomType}.` : '',
    'Photorealistic interior design render, architectural photography, natural lighting, high detail, 8k, no people, no text, no watermark.',
  ]
    .filter(Boolean)
    .join(' ');

  const imageModel =
    process.env.AICREDITS_IMAGE_MODEL || 'black-forest-labs/flux-1.1-pro';

  try {
    // Primary: Images API (Flux / DALL-E)
    const body: Record<string, unknown> = {
      model: imageModel,
      prompt: fullPrompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url',
    };

    // DALL-E 3 specific options
    if (imageModel.includes('dall-e')) {
      body.quality = 'hd';
      body.style = 'natural';
    }

    const data = await aicreditsFetch('/images/generations', body);
    const images: string[] = (data.data || [])
      .map((d: { url?: string; b64_json?: string }) => d.url)
      .filter(Boolean);

    if (images.length === 0) {
      throw new Error('No image URLs in response');
    }

    return { images, provider: `aicredits:${imageModel}`, raw: data };
  } catch (primaryErr: any) {
    console.warn('[ai] primary image model failed, trying dall-e-3', primaryErr.message);

    try {
      const data = await aicreditsFetch('/images/generations', {
        model: 'dall-e-3',
        prompt: fullPrompt.slice(0, 3900),
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        style: 'natural',
        response_format: 'url',
      });
      const images: string[] = (data.data || [])
        .map((d: { url?: string }) => d.url)
        .filter(Boolean);
      return { images, provider: 'aicredits:dall-e-3', raw: data };
    } catch (fallbackErr: any) {
      console.error('[ai] image generation failed', fallbackErr);
      // Last resort mock so UI still works
      return {
        images: [
          'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=80',
        ],
        provider: 'mock-fallback',
        analysis: String(fallbackErr.message),
      };
    }
  }
}

/**
 * Optional: multimodal redesign via chat image-output models
 * (e.g. google/gemini-2.5-flash-image) when you want the source photo as reference.
 */
export async function generateRoomDesignFromPhoto(input: GenerateRoomInput): Promise<GenerateRoomResult> {
  if (!AICREDITS_KEY) {
    return generateRoomDesign(input);
  }

  const model =
    process.env.AICREDITS_EDIT_MODEL || 'google/gemini-2.5-flash-image';

  try {
    const data = await aicreditsFetch('/chat/completions', {
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Redesign this room in the following style. Keep the same room layout, windows and proportions. Output a single photorealistic interior image only.\n\nStyle brief:\n${input.themePrompt}`,
            },
            {
              type: 'image_url',
              image_url: { url: input.imageUrl },
            },
          ],
        },
      ],
      max_tokens: 4096,
    });

    // Some image-output models return markdown image URLs or structured content
    const content = data.choices?.[0]?.message?.content || '';
    const urls: string[] = [];
    const mdMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/g);
    if (mdMatch) {
      for (const m of mdMatch) {
        const u = m.match(/\((https?:\/\/[^\s)]+)\)/)?.[1];
        if (u) urls.push(u);
      }
    }
    // Also check for raw URL lines
    const rawUrls = content.match(/https?:\/\/[^\s)"']+\.(png|jpg|jpeg|webp)/gi);
    if (rawUrls) urls.push(...rawUrls);

    if (urls.length > 0) {
      return { images: [...new Set(urls)], provider: `aicredits:${model}`, raw: data };
    }

    // Fall back to pure text-to-image if chat model didn't return image URLs
    return generateRoomDesign(input);
  } catch (e: any) {
    console.warn('[ai] photo-edit model failed, falling back to text-to-image', e.message);
    return generateRoomDesign(input);
  }
}
