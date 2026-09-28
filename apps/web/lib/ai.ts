/**
 * AI Room Redesign service.
 * Swap the provider implementation without changing the API surface.
 *
 * Current: Replicate (img2img / controlnet style).
 * Fallback: returns mock URLs when no token is set (for local UI testing).
 */

export type GenerateRoomInput = {
  imageUrl: string;
  themePrompt: string;
  roomType?: string;
  strength?: number; // 0.4–0.85 typical for img2img
};

export type GenerateRoomResult = {
  images: string[];
  provider: string;
  raw?: unknown;
};

export async function generateRoomDesign(
  input: GenerateRoomInput
): Promise<GenerateRoomResult> {
  const token = process.env.REPLICATE_API_TOKEN;

  if (!token) {
    // Dev / demo mode — return placeholder renders
    console.warn('[ai] No REPLICATE_API_TOKEN — using mock images');
    return {
      images: [
        'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=80',
        'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80',
        'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80',
      ],
      provider: 'mock',
    };
  }

  // Example: use a public img2img / interior model on Replicate.
  // Replace model version with one that fits your needs.
  const model =
    process.env.REPLICATE_MODEL ||
    'stability-ai/stable-diffusion-img2img:15a3689ee13b0d2616e98820eca0d3d57d1d4f3f2a4c4c4c4c4c4c4c4c4c4c4c';

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: model.includes(':') ? model.split(':')[1] : model,
      input: {
        image: input.imageUrl,
        prompt: input.themePrompt,
        negative_prompt:
          'blurry, low quality, distorted, cartoon, anime, text, watermark, people, clutter',
        strength: input.strength ?? 0.65,
        guidance_scale: 7.5,
        num_outputs: 2,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Replicate error: ${response.status} ${err}`);
  }

  const prediction = await response.json();
  const result = await pollPrediction(prediction.id, token);

  const images = Array.isArray(result.output)
    ? result.output
    : result.output
      ? [result.output]
      : [];

  return { images, provider: 'replicate', raw: result };
}

async function pollPrediction(
  id: string,
  token: string,
  maxAttempts = 60
): Promise<{ output?: string | string[]; status: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Token ${token}` },
    });
    const data = await res.json();
    if (data.status === 'succeeded') return data;
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`Prediction ${data.status}: ${data.error || 'unknown'}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Prediction timed out');
}
