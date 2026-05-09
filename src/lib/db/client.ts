import "server-only";

import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

// Cache the WebSocket connection across hot reloads in dev.
neonConfig.fetchConnectionCache = true;

let cached: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const sql = neon(url);
  cached = drizzle(sql, { schema });
  return cached;
}

export { schema };
