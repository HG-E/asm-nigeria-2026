import { readFileSync } from "node:fs"
import { Client } from "pg"

const file = process.argv[2]
if (!file) {
  console.error("Usage: node scripts/apply-migration.mjs supabase/migrations/xxxx.sql")
  process.exit(1)
}

const sql = readFileSync(file, "utf8")

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
try {
  await client.query("BEGIN")
  await client.query(sql)
  await client.query("COMMIT")
  console.log(`Applied ${file}`)
} catch (err) {
  await client.query("ROLLBACK")
  console.error(`Failed to apply ${file}:`, err.message)
  process.exit(1)
} finally {
  await client.end()
}
