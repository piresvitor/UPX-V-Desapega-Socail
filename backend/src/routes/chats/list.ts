import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, or, desc } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { chatRooms, messages } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth'; 

export const listChatsRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/chats', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Chats'],
      summary: 'Listar Conversas (Inbox)',
      description: 'Retorna todas as salas de chat ativas do usuário logado, formatando a "outra pessoa" da conversa e a última mensagem.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header required')
      }),
      response: {
        200: z.array(z.object({
          id: z.uuid(),
          type: z.string(),
          status: z.string(),
          item: z.object({
            id: z.uuid(),
            title: z.string(),
            imageUrls: z.array(z.string()).nullable().optional(),
          }),
          otherUser: z.object({
            id: z.uuid(),
            fullName: z.string(),
          }),
          lastMessage: z.object({
            content: z.string(),
            createdAt: z.date(),
            readAt: z.date().nullable(),
            senderId: z.uuid(), 
          }).nullable().optional(),
        })),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.sub;

      const rooms = await db.query.chatRooms.findMany({
        where: or(
          eq(chatRooms.participant1, userId),
          eq(chatRooms.participant2, userId)
        ),
        orderBy: [desc(chatRooms.createdAt)], 
        with: {
          item: {
            columns: { id: true, title: true, imageUrls: true }
          },
          user1: { 
            columns: { id: true, fullName: true }
          },
          user2: { 
            columns: { id: true, fullName: true }
          },
          messages: { 
            orderBy: [desc(messages.createdAt)],
            limit: 1,
            columns: { content: true, createdAt: true, readAt: true, senderId: true } 
          }
        }
      });

      const formattedRooms = rooms.map(room => {
        const isUser1 = room.user1.id === userId;
        const otherUser = isUser1 ? room.user2 : room.user1;

        return {
          id: room.id,
          type: room.type,
          status: room.status,
          item: {
            id: room.item.id,
            title: room.item.title,
            imageUrls: room.item.imageUrls,
          },
          otherUser: {
            id: otherUser.id,
            fullName: otherUser.fullName,
          },
          lastMessage: room.messages.length > 0 ? room.messages[0] : null,
        };
      });

      return reply.status(200).send(formattedRooms);

    } catch (error) {
      console.error('Erro ao listar conversas:', error);
      return reply.status(500).send({ message: 'Erro interno ao buscar as conversas.' });
    }
  });
};