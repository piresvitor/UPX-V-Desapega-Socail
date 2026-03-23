import 'dotenv/config'; 
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('A variável de ambiente DATABASE_URL é obrigatória para o Drizzle.');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts', 
  out: './drizzle',                  
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },

  // Ajuda a manter o banco limpo removendo tabelas deletadas no código
  verbose: true,
  strict: true,
});