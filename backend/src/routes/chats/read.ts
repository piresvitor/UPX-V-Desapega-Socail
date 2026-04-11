import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and, isNull, ne } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { messages } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

export const markAsReadRoute: FastifyPluginAsyncZod = async (server) => {
  server.patch('/chats/:roomId/read', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Chats'],
      summary: 'Marcar mensagens como lidas',
      params: z.object({ roomId: z.uuid() }),
      response: { 
        200: z.object({ success: z.boolean() }),
        500: z.object({ success: z.boolean() }) 
      }
    }
  }, async (request, reply) => {
    try {
      const { roomId } = request.params;
      const userId = request.user.sub;

      await db.update(messages)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(messages.roomId, roomId),
            ne(messages.senderId, userId), // Só marca como lida as mensagens da outra pessoa
            isNull(messages.readAt)        // Só atualiza as que ainda não foram lidas
          )
        );

      return reply.status(200).send({ success: true });
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
      return reply.status(500).send({ success: false });
    }
  });
};