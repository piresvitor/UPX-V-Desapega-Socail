import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não encontrada no arquivo .env');
}


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Essencial para o Render não bloquear a conexão
  }
});

console.log('🔗 Cliente PostgreSQL (node-postgres) configurado com sucesso!');

export const db = drizzle(pool, { schema });