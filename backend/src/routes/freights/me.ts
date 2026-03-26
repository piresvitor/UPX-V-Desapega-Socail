import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, or, desc } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { freightRequests, items } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

export const myFreightsRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/freights/me', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Fretes'],
      summary: 'Meu Histórico de Fretes',
      description: 'Retorna todas as solicitações de frete onde o usuário logado é o motorista ou o beneficiário.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header required')
      }),
      response: {
        200: z.array(z.object({
          id: z.uuid(),
          status: z.string(),
          estimatedPrice: z.string().nullable(),
          createdAt: z.date(),
          roleInFreight: z.string(),
          item: z.object({
            id: z.uuid(),
            title: z.string(),
            imageUrls: z.array(z.string()).nullable().optional(),
          })
        })),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.sub;

      // Usamos o select tradicional com innerJoin para garantir que puxamos os dados do Item junto
      const results = await db
        .select({
          id: freightRequests.id,
          status: freightRequests.status,
          estimatedPrice: freightRequests.estimatedPrice,
          createdAt: freightRequests.createdAt,
          freighterId: freightRequests.freighterId,
          beneficiaryId: freightRequests.beneficiaryId,
          item: {
            id: items.id,
            title: items.title,
            imageUrls: items.imageUrls,
          }
        })
        .from(freightRequests)
        .innerJoin(items, eq(freightRequests.itemId, items.id))
        .where(
          // Traz se ele for o criador do pedido OU o motorista que aceitou
          or(
            eq(freightRequests.beneficiaryId, userId),
            eq(freightRequests.freighterId, userId)
          )
        )
        .orderBy(desc(freightRequests.createdAt)); // Os mais recentes no topo

      // Formata os dados para o frontend saber exatamente qual era o papel do usuário nessa corrida
      const formattedFreights = results.map(freight => ({
        id: freight.id,
        status: freight.status,
        estimatedPrice: freight.estimatedPrice ? String(freight.estimatedPrice) : null,
        createdAt: freight.createdAt,
        roleInFreight: freight.freighterId === userId ? 'Motorista' : 'Beneficiário',
        item: freight.item
      }));

      return reply.status(200).send(formattedFreights);

    } catch (error) {
      console.error('Erro ao buscar meus fretes:', error);
      return reply.status(500).send({ message: 'Erro interno ao carregar o histórico de fretes.' });
    }
  });
};