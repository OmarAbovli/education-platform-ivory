import { neon, Pool } from "@neondatabase/serverless"

// IMPORTANT: Set DATABASE_URL in your environment to enable DB.
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.warn("DATABASE_URL not set. Server actions that query the DB will fail in preview.")
}

// Low-latency one-shot query utility (HTTP)
export const sql = databaseUrl
  ? neon(databaseUrl)
  : async (..._args: any[]) => {
      throw new Error("DATABASE_URL not configured")
    }

// Stateful connection pool (WebSocket) for Transactions
export const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null
