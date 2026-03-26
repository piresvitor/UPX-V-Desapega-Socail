import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and, or, isNull } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { items, chatRooms, freightRequests } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

const createChatBodySchema = z.object({
  itemId: z.string().uuid('O ID do item deve ser um UUID válido'),
  type: z.enum(['DONATION', 'FREIGHT']).default('DONATION'), 
});

export const createChatRoute: FastifyPluginAsyncZod = async (server) => {
  server.post('/chats', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Chats'],
      summary: 'Iniciar ou Recuperar Conversa',
      description: 'Cria uma nova sala de chat para um item (Doação ou Frete).',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header required')
      }),
      body: createChatBodySchema,
      response: {
        200: z.object({ message: z.string(), roomId: z.string().uuid(), isNew: z.boolean() }),
        201: z.object({ message: z.string(), roomId: z.string().uuid(), isNew: z.boolean() }),
        400: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const { itemId, type } = request.body;
      const userId = request.user.sub; 

      let targetUserId: string;

      // Lógica para Chat de DOAÇÃO (Fala com o Dono do Item)
      if (type === 'DONATION') {
        const item = await db.query.items.findFirst({
          where: and(eq(items.id, itemId), isNull(items.deletedAt))
        });
        if (!item) return reply.status(404).send({ message: 'Item não encontrado.' });
        if (item.donorId === userId) return reply.status(400).send({ message: 'Você não pode iniciar um chat com o seu próprio item.' });
        
        targetUserId = item.donorId;
      } 
      // Lógica para Chat de FRETE (Fala com o Beneficiário ou Freteiro)
      else {
        const freight = await db.query.freightRequests.findFirst({
          where: eq(freightRequests.itemId, itemId)
        });
        if (!freight) return reply.status(404).send({ message: 'Solicitação de frete não encontrada para este item.' });
        
        // Se eu sou o Freteiro, quero falar com o Beneficiário
        if (userId !== freight.beneficiaryId) {
          targetUserId = freight.beneficiaryId;
        } 
        // Se eu sou o Beneficiário, quero falar com o Freteiro (só dá se ele já aceitou)
        else {
          if (!freight.freighterId) return reply.status(400).send({ message: 'Nenhum motorista aceitou este frete ainda.' });
          targetUserId = freight.freighterId;
        }
      }

      // Verifica se a sala já existe entre o Usuário Logado e o Target (Alvo)
      const existingRoom = await db.query.chatRooms.findFirst({
        where: and(
          eq(chatRooms.itemId, itemId),
          eq(chatRooms.type, type),
          or(
            and(eq(chatRooms.participant1, userId), eq(chatRooms.participant2, targetUserId)),
            and(eq(chatRooms.participant1, targetUserId), eq(chatRooms.participant2, userId))
          )
        )
      });

      if (existingRoom) {
        return reply.status(200).send({ message: 'Sala recuperada com sucesso.', roomId: existingRoom.id, isNew: false });
      }

      // Se não existe, criamos a sala nova
      const [newRoom] = await db.insert(chatRooms).values({
        itemId: itemId,
        participant1: userId, 
        participant2: targetUserId, 
        type: type,
        status: 'Ativo'
      }).returning({ id: chatRooms.id });

      return reply.status(201).send({ message: 'Sala de chat criada com sucesso!', roomId: newRoom.id, isNew: true });

    } catch (error) {
      console.error('Erro ao iniciar chat:', error);
      return reply.status(500).send({ message: 'Erro interno ao tentar iniciar o chat.' });
    }
  });
};