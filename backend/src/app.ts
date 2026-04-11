import fastify from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider, jsonSchemaTransform } from 'fastify-type-provider-zod';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifySocketIO from 'fastify-socket.io';


// Importação das rotas
import { registerRoute } from './routes/auth/register'; 
import { healthRoute } from './routes/health'; 
import { loginRoute } from './routes/auth/login';
import { updateFcmTokenRoute } from './routes/users/update-fcm'; 
import { getMeRoute } from './routes/users/get-me';
import { updateMeRoute } from './routes/users/update-me';
import { deleteMeRoute } from './routes/users/delete-me';
import { createItemRoute } from './routes/items/create';
import { listItemsRoute } from './routes/items/list';
import { getItemRoute } from './routes/items/get-item';
import { updateItemRoute } from './routes/items/update';
import { updateItemStatusRoute } from './routes/items/patch-status';
import { deleteItemRoute } from './routes/items/delete';
import { createChatRoute } from './routes/chats/create';
import { listChatsRoute } from './routes/chats/list';
import { myFreightsRoute } from './routes/freights/me';
import { updateFreightStatusRoute } from './routes/freights/status';
import { initializeFirebase } from './services/firebase';
import { setupWebSockets } from './sockets/chat';
import { listMessagesRoute } from './routes/chats/messages';
import { createFreightRoute } from './routes/freights/create';
import { availableFreightsRoute } from './routes/freights/available';
import { acceptFreightRoute } from './routes/freights/accept';
import { createVerificationRoute } from './routes/verifications/create';
import { analyzeVerificationRoute } from './routes/verifications/analyze';
import { getMyVerificationRoute } from './routes/verifications/me'
import { createReviewRoute } from './routes/reviews/create';
import { listReviewsRoute } from './routes/reviews/list';
import { getPublicProfileRoute } from './routes/users/get-public';
import { adminVerifyUserRoute } from './routes/admin/verify'
import { listPendingVerificationsRoute } from './routes/admin/list-pending'
import { adminBanUserRoute } from './routes/admin/ban-user'
import { adminDashboardRoute } from './routes/admin/dashboard'
import { publicStatisticsRoute } from './routes/public/statistics'
import { listUsersRoute } from './routes/admin/list-users'
import { getMyItemsRoute } from './routes/items/get-my-items'
import { markAsReadRoute } from './routes/chats/read'

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

app.register(fastifySocketIO, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Prepara o Fastify a receber arquivos (Uploads de fotos/PDFs)
app.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite de 5MB por arquivo (Evita travamentos de memória)
    files: 2,                  // Aceita no máximo 2 arquivos por requisição (Ex: RG e Holerite)
  }
});

// Configurações do Swagger 
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

// Inicializa o Firebase
initializeFirebase();

// Serviço de Socket
setupWebSockets(app);

// Rotas
app.register(registerRoute);
app.register(healthRoute)
app.register(loginRoute)
app.register(updateFcmTokenRoute)
app.register(getMeRoute)
app.register(updateMeRoute)
app.register(deleteMeRoute)
app.register(createItemRoute)
app.register(listItemsRoute)
app.register(getItemRoute)
app.register(updateItemRoute)
app.register(updateItemStatusRoute)
app.register(deleteItemRoute)
app.register(createChatRoute);
app.register(listChatsRoute);
app.register(listMessagesRoute);
app.register(createFreightRoute);
app.register(availableFreightsRoute);
app.register(acceptFreightRoute);
app.register(updateFreightStatusRoute);
app.register(myFreightsRoute);
app.register(createVerificationRoute); 
app.register(analyzeVerificationRoute);
app.register(getMyVerificationRoute)
app.register(createReviewRoute);
app.register(listReviewsRoute);
app.register(getPublicProfileRoute)
app.register(adminVerifyUserRoute)
app.register(listPendingVerificationsRoute)
app.register(adminBanUserRoute)
app. register(adminDashboardRoute)
app.register(publicStatisticsRoute)
app.register(listUsersRoute)
app.register(getMyItemsRoute)
app.register(markAsReadRoute)

export { app };