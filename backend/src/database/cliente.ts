import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.ts';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não encontrada no arquivo .env');
}

// Inicializa o cliente do Postgres moderno com as configurações otimizadas para o Supabase
const client = postgres(process.env.DATABASE_URL, { 
  max: 20, // Máximo de conexões simultâneas
  idle_timeout: 30,
  connect_timeout: 2,
  prepare: false // Evita o crash no pooler do Supabase!
});

// Mensagem de sucesso ao carregar o arquivo
console.log('Cliente PostgreSQL (postgres.js) configurado para Supabase!');

export const db = drizzle(client, { schema });