import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { users } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth'

export const updateFcmTokenRoute: FastifyPluginAsyncZod = async (server) => {
  server.patch('/users/fcm-token', {
    onRequest: [authenticateToken], 
    schema: {
      tags: ['Users'],
      summary: 'Atualizar FCM Token',
      description: 'Salva ou atualiza o token do dispositivo para Push Notifications',
      body: z.object({
        fcmToken: z.string().min(1, 'O token não pode ser vazio'),
      }),
      response: {
        200: z.object({ message: z.string() }),
      },
    },
  }, async (request, reply) => {
    const { fcmToken } = request.body;
    
    const userId = request.user.sub; 

    // Atualiza apenas o fcmToken do usuário logado
    await db.update(users)
      .set({ fcmToken })
      .where(eq(users.id, userId));

    return reply.status(200).send({ message: 'FCM Token atualizado com sucesso!' });
  });
};