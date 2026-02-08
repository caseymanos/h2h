/**
 * Convex API reference for the h2h app.
 * Uses anyApi for runtime function references — works without
 * generated types present at build time (e.g. Vercel deploys).
 * Run `npx convex dev` locally to get full type-safe imports.
 */
import { anyApi } from 'convex/server';

export const api = anyApi as any;
