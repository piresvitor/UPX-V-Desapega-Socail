import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { and, desc, eq, isNull, sql } from 'drizzle-orm'; 
import { db } from '../../database/cliente';
import { items, users } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth'; 

export const getMyItemsRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/items/me', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Items'],
      summary: 'Meus Itens Postados',
      description: 'Lista todos os itens criados pelo usuário autenticado, independente do status.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/)
      }),
      response: {
        200: z.array(z.object({
          id: z.uuid(), 
          title: z.string(),
          category: z.string(),
          imageUrls: z.array(z.string()).nullable().optional(),
          status: z.string(),
          createdAt: z.coerce.date(), 
        })),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.sub; // Pega o ID do token

      const myItems = await db.select({
        id: items.id,
        title: items.title,
        category: items.category,
        imageUrls: items.imageUrls,
        status: items.status,
        createdAt: items.createdAt,
      })
      .from(items)
      // Traz onde o donorId bate com o Token AND não está deletado
      .where(and(
        eq(items.donorId, userId),
        isNull(items.deletedAt) 
      ))
      .orderBy(desc(items.createdAt)); // Mais novos primeiro

      return reply.status(200).send(myItems);

    } catch (error) {
      console.error('Erro ao buscar itens do usuário:', error);
      return reply.status(500).send({ message: 'Erro interno ao buscar seus itens.' });
    }
  });
};