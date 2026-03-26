import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { messages, chatRooms } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

export const listMessagesRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/chats/:roomId/messages', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Chats'],
      summary: 'Histórico de Mensagens',
      description: 'Retorna as últimas 50 mensagens de uma sala de chat específica.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header required')
      }),
      params: z.object({
        roomId: z.uuid('O ID da sala deve ser um UUID válido')
      }),
      response: {
        200: z.array(z.object({
          id: z.uuid(),
          senderId: z.uuid(),
          content: z.string(),
          createdAt: z.date(),
          readAt: z.date().nullable(),
        })),
        403: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const { roomId } = request.params;
      const userId = request.user.sub;

      // Verifica se a sala existe
      const room = await db.query.chatRooms.findFirst({
        where: eq(chatRooms.id, roomId)
      });

      if (!room) {
        return reply.status(404).send({ message: 'Sala de chat não encontrada.' });
      }

      // Trava de Segurança: Um usuário intruso não pode ler conversas de terceiros
      if (room.participant1 !== userId && room.participant2 !== userId) {
        return reply.status(403).send({ message: 'Você não tem permissão para ler o histórico desta conversa.' });
      }

      // Busca as mensagens mais recentes
      const history = await db.query.messages.findMany({
        where: eq(messages.roomId, roomId),
        orderBy: [desc(messages.createdAt)], // Puxa da mais nova para a mais velha
        limit: 50 // Paginação simples para não travar o celular carregando 1000 mensagens
      });

      // Opcional: Inverter a ordem para o frontend receber da mais velha para a mais nova (ajuda na hora de renderizar a lista)
      const chronologicalHistory = history.reverse();

      return reply.status(200).send(chronologicalHistory);

    } catch (error) {
      console.error('Erro ao buscar histórico de mensagens:', error);
      return reply.status(500).send({ message: 'Erro interno ao tentar carregar as mensagens.' });
    }
  });
};