import fastify from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider, jsonSchemaTransform } from 'fastify-type-provider-zod';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';


// Importação das rotas
import { registerRoute } from './routes/auth/register'; 
import { healthRoute } from './routes/health'; 
import { loginRoute } from './routes/auth/login';
import { updateFcmTokenRoute } from './routes/users/update-fcm'; 
import { getMeRoute } from './routes/users/get-me';
import { updateMeRoute } from './routes/users/update-me';
import { deleteMeRoute } from './routes/users/delete-me';
import { createItemRoute } from './routes/items/create';

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

// CONFIGURAÇÃO DO SWAGGER 
if (process.env.NODE_ENV === "development") {
  app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "Desapega Social",
        description: "API para o projeto UPX 5.",
        version: '1.0.0'
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  app.register(fastifySwaggerUi, {
    routePrefix: '/docs', 
  });
}

// rotas
app.register(registerRoute);
app.register(healthRoute)
app.register(loginRoute)
app.register(updateFcmTokenRoute)
app.register(getMeRoute)
app.register(updateMeRoute)
app.register(deleteMeRoute)
app.register(createItemRoute)

export { app };