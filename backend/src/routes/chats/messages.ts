import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { messages } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

export const listMessagesRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/chats/:roomId/messages', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Chats'],
      summary: 'Histórico de Mensagens',
      description: 'Retorna as mensagens de uma sala de chat de forma paginada.',
      params: z.object({
        roomId: z.uuid(),
      }),
      querystring: z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(50),
      }),
      response: {
        200: z.array(z.object({
          id: z.uuid(),
          senderId: z.uuid(),
          content: z.string(),
          createdAt: z.date(),
        })),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const { roomId } = request.params;
      const { page, limit } = request.query;

      const chatMessages = await db.query.messages.findMany({
        where: eq(messages.roomId, roomId),
        orderBy: [desc(messages.createdAt)],
        limit: limit,
        offset: (page - 1) * limit,
      });

      // Retornamos na ordem cronológica inversa (mais recentes primeiro)
      // O frontend inverte isso na tela para a rolagem ficar correta
      return reply.status(200).send(chatMessages);

    } catch (error) {
      console.error('Erro ao buscar histórico de mensagens:', error);
      return reply.status(500).send({ message: 'Erro interno ao carregar mensagens.' });
    }
  });
};