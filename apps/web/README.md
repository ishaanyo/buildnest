# BuildNest Web (Vercel)

Next.js App Router API + Prisma + Neon.

```bash
npm install
cp .env.example .env   # fill DATABASE_URL, etc.
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Deploy:

```bash
vercel
```

Set the same env vars in the Vercel project dashboard.
