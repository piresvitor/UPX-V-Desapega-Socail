import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and, or, isNull } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { items, chatRooms } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth'; 

const createChatBodySchema = z.object({
  itemId: z.uuid('O ID do item deve ser um UUID válido'),

  // Por enquanto vamos focar no tipo DONATION (Doação). 
  // No futuro, se for frete, enviaremos type: 'FREIGHT'
  type: z.enum(['DONATION', 'FREIGHT']).default('DONATION'), 
});

export const createChatRoute: FastifyPluginAsyncZod = async (server) => {
  server.post('/chats', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Chats'],
      summary: 'Iniciar ou Recuperar Conversa',
      description: 'Cria uma nova sala de chat para um item ou retorna a sala existente entre os dois usuários.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header required')
      }),
      body: createChatBodySchema,
      response: {
        200: z.object({ 
          message: z.string(),
          roomId: z.string().uuid(),
          isNew: z.boolean()
        }),
        201: z.object({ 
          message: z.string(),
          roomId: z.uuid(),
          isNew: z.boolean()
        }),
        400: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const { itemId, type } = request.body;
      const userId = request.user.sub; // Quem está clicando no botão (Beneficiário)

      // Busca o item para saber quem é o dono (Doador)
      const item = await db.query.items.findFirst({
        where: and(
          eq(items.id, itemId),
          isNull(items.deletedAt)
        )
      });

      if (!item) {
        return reply.status(404).send({ message: 'Item não encontrado ou indisponível.' });
      }

      // Regra de Negócio: O doador não pode abrir um chat de doação consigo mesmo!
      if (item.donorId === userId && type === 'DONATION') {
        return reply.status(400).send({ message: 'Você não pode iniciar um chat de doação com o seu próprio item.' });
      }

      // Verifica se a sala já existe entre esses dois usuários para este item
      const existingRoom = await db.query.chatRooms.findFirst({
        where: and(
          eq(chatRooms.itemId, itemId),
          eq(chatRooms.type, type),
          // O Drizzle OR checa as duas combinações possíveis (Eu sou o participante 1 e ele o 2, ou vice-versa)
          or(
            and(eq(chatRooms.participant1, userId), eq(chatRooms.participant2, item.donorId)),
            and(eq(chatRooms.participant1, item.donorId), eq(chatRooms.participant2, userId))
          )
        )
      });

      // Se a sala já existe, devolvemos ela (Status 200)
      if (existingRoom) {
        return reply.status(200).send({
          message: 'Sala recuperada com sucesso.',
          roomId: existingRoom.id,
          isNew: false
        });
      }

      // Se não existe, criamos a sala nova (Status 201)
      const [newRoom] = await db.insert(chatRooms).values({
        itemId: itemId,
        participant1: userId, // Quem iniciou a conversa
        participant2: item.donorId, // O dono do item
        type: type,
        status: 'Ativo'
      }).returning({ id: chatRooms.id });

      return reply.status(201).send({
        message: 'Sala de chat criada com sucesso!',
        roomId: newRoom.id,
        isNew: true
      });

    } catch (error) {
      console.error('Erro ao iniciar chat:', error);
      return reply.status(500).send({ message: 'Erro interno ao tentar iniciar o chat.' });
    }
  });
};