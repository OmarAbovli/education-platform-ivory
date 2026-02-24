import { neon } from "@neondatabase/serverless"

// IMPORTANT: Set DATABASE_URL in your environment to enable DB.
// In Next.js preview without env vars, this will throw if queried.
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.warn("DATABASE_URL not set. Server actions that query the DB will fail in preview.")
}
export const sql = databaseUrl
  ? neon(databaseUrl)
  : async (..._args: any[]) => {
      throw new Error("DATABASE_URL not configured")
    }
