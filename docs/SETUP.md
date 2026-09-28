# BuildNest Setup Guide

## 1. Neon Database

1. Create a free project at https://neon.tech
2. Copy the connection string (pooled recommended for serverless)
3. Set `DATABASE_URL` in Vercel and locally

## 2. AICredits (required for AI)

1. Account + key at https://aicredits.in
2. Set env vars:

```bash
AICREDITS_API_KEY=sk-live-...
AICREDITS_BASE_URL=https://api.aicredits.in/v1
AICREDITS_IMAGE_MODEL=black-forest-labs/flux-1.1-pro   # or dall-e-3
AICREDITS_EDIT_MODEL=google/gemini-2.5-flash-image     # photo-conditioned redesign
AICREDITS_VISION_MODEL=openai/gpt-4o-mini              # room analysis + costs
```

### Model choices (from https://aicredits.in/models)

| Task | Recommended model | Why |
|------|-------------------|-----|
| Interior render (text→image) | `black-forest-labs/flux-1.1-pro` | Photoreal, good interiors, ~₹4/img |
| Fast/cheap render | `black-forest-labs/flux-1-schnell` | ~₹0.20/img |
| Classic | `dall-e-3` | Reliable, ~₹4–10/img |
| Photo → redesign | `google/gemini-2.5-flash-image` | Multimodal image edit via Chat API |
| Room analysis / BOM | `openai/gpt-4o-mini` or `google/gemini-2.0-flash` | Vision + JSON structured output |

## 3. Vercel Project

```bash
cd apps/web
npm install
cp .env.example .env   # fill values
npx prisma generate
npx prisma db push
npm run db:seed
vercel
```

## 4. Flutter App

```bash
cd apps/flutter_app
flutter create . --project-name buildnest
flutter pub get
flutter run --dart-define=API_BASE=https://your-app.vercel.app
```

## 5. Flow

1. Upload room photo / plot
2. Pick theme (prompt stored in DB)
3. API: vision analysis → material + labor estimate (INR)
4. API: Flux / Gemini image gen → design renders
5. User buys material + optional labor package
