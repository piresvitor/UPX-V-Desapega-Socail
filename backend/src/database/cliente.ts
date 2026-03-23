import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema.ts" // 
import 'dotenv/config'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não encontrada no arquivo .env')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Máximo de 20 conexões simultâneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Log de conexão p
pool.on('connect', () => {
  console.log('PostgreSQL conectado com sucesso!')
})

pool.on('error', () => {
  console.error('Erro inesperado no pool de conexões:')
})

export const db = drizzle(pool, { schema })