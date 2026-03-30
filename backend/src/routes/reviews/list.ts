import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { reviews } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

export const listReviewsRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/reviews/:userId', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Reviews'],
      summary: 'Listar Avaliações',
      description: 'Retorna todas as avaliações que um usuário específico recebeu, incluindo o nome de quem avaliou.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header must be Bearer token')
      }),
      params: z.object({
        userId: z.string().uuid({ message: 'ID de usuário inválido.' })
      }),
      response: {
        200: z.array(z.object({
          id: z.uuid(),
          rating: z.string(),
          comment: z.string().nullable().optional(),
          createdAt: z.date(),
          reviewer: z.object({
            id: z.uuid(),
            fullName: z.string()
          }).nullable()
        })),
        500: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const { userId } = request.params;

    try {
      const userReviews = await db.query.reviews.findMany({
        where: eq(reviews.revieweeId, userId),
        orderBy: [desc(reviews.createdAt)],
        with: {
          reviewer: {
            columns: {
              id: true,
              fullName: true,
            }
          }
        }
      });

      return reply.status(200).send(userReviews);

    } catch (error) {
      console.error('[REVIEWS] Erro ao buscar avaliações:', error);
      return reply.status(500).send({ error: 'Erro interno ao buscar as avaliações.' });
    }
  });
};