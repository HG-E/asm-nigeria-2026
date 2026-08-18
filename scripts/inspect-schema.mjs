import { Client } from "pg"

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

await client.connect()

const { rows: cols } = await client.query(`
  select table_name, column_name, data_type, udt_name, is_nullable, column_default,
         character_maximum_length
  from information_schema.columns
  where table_schema = 'public'
  order by table_name, ordinal_position
`)

const { rows: enums } = await client.query(`
  select t.typname, e.enumlabel
  from pg_type t join pg_enum e on t.oid = e.enumtypid
  where t.typnamespace = 'public'::regnamespace
  order by t.typname, e.enumsortorder
`)

const { rows: pks } = await client.query(`
  select tc.table_name, kcu.column_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
  where tc.constraint_type = 'PRIMARY KEY' and tc.table_schema = 'public'
`)

console.log(JSON.stringify({ cols, enums, pks }, null, 2))

await client.end()
