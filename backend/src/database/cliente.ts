import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.ts';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não encontrada no arquivo .env');
}

// Configuração blindada para Supabase na Nuvem
const client = postgres(process.env.DATABASE_URL, { 
  max: 20, 
  idle_timeout: 30,
  connect_timeout: 10,
  prepare: false,      // Necessário para o Pooler do Supabase
  ssl: 'require'       // Força a criptografia para o Render não ser bloqueado
});

console.log('Cliente PostgreSQL configurado com SSL para a Nuvem!');

export const db = drizzle(client, { schema });