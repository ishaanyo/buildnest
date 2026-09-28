# BuildNest — AI Room Interior Design + Material & Labor Package

Transform a room photo or plot map into AI-generated interior designs with multiple themes, automatic material cost calculation, labor estimates, and ready-to-buy packages.

## Architecture

```
buildnest/
├── apps/
│   ├── flutter_app/          # Mobile client (iOS + Android)
│   └── web/                  # Next.js API + Admin (Vercel)
├── packages/
│   └── shared/               # Shared types / constants
├── docs/                     # Setup guides
└── prisma/                   # Neon Postgres schema (inside web)
```

### Stack
- **Frontend**: Flutter 3.x (camera, gallery, image picker, HTTP)
- **Backend**: Next.js 14 App Router + API Routes (deployed on Vercel)
- **Database**: Neon Postgres + Prisma ORM
- **AI**: Image-to-image room redesign (Replicate / Stability AI / custom ControlNet) — keys via env
- **Storage**: Vercel Blob or Cloudflare R2 for uploaded photos & renders
- **Auth**: Optional Clerk / simple JWT (placeholder)

## Core User Flow

1. User opens app → takes photo of room **or** picks from gallery **or** uploads plot map
2. Selects a design theme (Modern, Minimalist, Luxury, Scandinavian, Industrial, Boho, Japanese, etc.)
3. Backend sends image + theme prompt to AI model → returns 3D-style / photorealistic interior renders
4. System calculates:
   - Material list + cost (from catalog)
   - Labor cost (by region / complexity)
   - Total package price
5. User can buy materials + optional labor package

## Features

| Feature | Status |
|---------|--------|
| Camera / Gallery capture | ✅ |
| Theme selection with curated prompts | ✅ |
| AI room redesign (image-to-image) | 🔌 Pluggable |
| Material cost calculation | ✅ |
| Labor cost estimation | ✅ |
| Order / package checkout | 🟡 Scaffold |
| Admin material catalog | 🟡 Scaffold |

## Quick Start

See [docs/SETUP.md](docs/SETUP.md)

## Environment Variables (Vercel / local)

```bash
DATABASE_URL=postgresql://...neon.tech/...
REPLICATE_API_TOKEN=...
BLOB_READ_WRITE_TOKEN=...          # or R2 credentials
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## License
Private — BuildNest
