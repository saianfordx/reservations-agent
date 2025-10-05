# Convex Backend

This directory contains all Convex backend logic for the AI Reservations platform.

## Setup

1. Install Convex CLI:
   ```bash
   npm install -g convex
   ```

2. Initialize Convex:
   ```bash
   npx convex dev
   ```

3. This will:
   - Create a new Convex project
   - Generate `convex/_generated` files
   - Start the development server
   - Output your `NEXT_PUBLIC_CONVEX_URL`

4. Add the URL to `.env.local`:
   ```
   NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
   ```

## Schema

The database schema is defined in `schema.ts`. It includes:

- **users**: User accounts (synced from Clerk)
- **restaurants**: Restaurant information
- **agents**: AI agent configurations
- **reservations**: Reservation records

## Queries & Mutations

- **Queries**: Read-only operations (reactive)
- **Mutations**: Write operations
- **Actions**: External API calls (ElevenLabs)

## Development

Watch for schema changes:
```bash
npx convex dev
```

Deploy to production:
```bash
npx convex deploy
```
