import fastify from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';

const app = fastify().withTypeProvider<ZodTypeProvider>();

// Setup do Zod
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// Plugins essenciais
app.register(cors, { origin: true });
if (!process.env.JWT_SECRET) {
  throw new Error('A variável JWT_SECRET não foi definida no arquivo .env');
}

app.register(jwt, { 
  secret: process.env.JWT_SECRET 
});

// rotas
// Rota de Teste (Health Check)
app.get('/health', async () => {
  return { 
    status: 'online', 
    timestamp: new Date().toISOString(),
    project: 'UPX 5'
  };
});


export { app };