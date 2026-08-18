import { Client } from "pg"

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

await client.connect()

const { rows } = await client.query(`
  select tablename, policyname, cmd, qual, with_check
  from pg_policies
  where schemaname = 'public' and tablename in ('submission_documents','submission_versions')
  order by tablename, cmd
`)
for (const p of rows) {
  console.log(`\n[${p.tablename}] ${p.cmd} "${p.policyname}"`)
  console.log("  USING:      ", p.qual)
  console.log("  WITH CHECK: ", p.with_check)
}

await client.end()
