// Aplica supabase/*.sql a la base usando DATABASE_URL de .env (nunca se commitea).
//   npm run db:schema   -> supabase/schema.sql
//   npm run db:seed     -> supabase/seed.sql
import { readFileSync } from 'node:fs';
import pg from 'pg';

const file = process.argv[2];
const url = process.env.DATABASE_URL;
if (!url || url.includes('[YOUR-PASSWORD]')) {
  console.error('Falta DATABASE_URL en .env (con la contraseña real).');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query('begin');
  await client.query(readFileSync(file, 'utf8'));
  await client.query('commit');
  console.log(`OK: ${file} aplicado.`);
} catch (err) {
  await client.query('rollback');
  console.error(`Error aplicando ${file} (no se aplicó nada):`, err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
