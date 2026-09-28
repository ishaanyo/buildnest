# BuildNest Setup Guide

## 1. Neon Database

1. Create a free project at https://neon.tech
2. Copy the connection string (pooled recommended for serverless)
3. Set `DATABASE_URL` in Vercel and locally

## 2. Vercel Project

```bash
cd apps/web
npm install
npx prisma generate
npx prisma db push          # or migrate
vercel                      # link & deploy
```

Add env vars in Vercel dashboard.

## 3. Flutter App

```bash
cd apps/flutter_app
flutter pub get
flutter run
```

Update `lib/services/api_service.dart` with your Vercel URL.

## 4. AI Provider (Replicate example)

1. Create account at replicate.com
2. Use a model such as:
   - `jagilley/controlnet-hough` or room-specific interior models
   - Or `stability-ai/stable-diffusion-img2img`
3. Set `REPLICATE_API_TOKEN`

You can swap the provider in `apps/web/lib/ai.ts`.

## 5. GitHub

```bash
git add .
git commit -m "Initial BuildNest scaffold"
git push origin main
```

Connect the repo to Vercel for automatic deploys.
