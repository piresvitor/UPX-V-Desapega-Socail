import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { reviews, users } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

export const createReviewRoute: FastifyPluginAsyncZod = async (server) => {
  server.post('/reviews', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Reviews'],
      summary: 'Criar Avaliação',
      description: 'Cria uma nova avaliação de 1 a 5 estrelas para um usuário e recalcula sua média de reputação automaticamente.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header must be Bearer token')
      }),
      body: z.object({
        revieweeId: z.uuid({ message: 'ID do avaliado inválido.' }),
        itemId: z.uuid().optional(),
        rating: z.number().min(1).max(5, { message: 'A nota deve ser entre 1 e 5.' }),
        comment: z.string().max(500, { message: 'O comentário é muito longo.' }).optional(),
      }),
      response: {
        201: z.object({ message: z.string() }),
        403: z.object({ error: z.string() }),
        404: z.object({ error: z.string() }),
        500: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const reviewerId = request.user.sub;
    const { revieweeId, itemId, rating, comment } = request.body;

    // Regra de Negócio: Impedir auto-avaliação
    if (reviewerId === revieweeId) {
      return reply.status(403).send({ error: 'Você não pode avaliar a si mesmo.' });
    }

    try {
      await db.transaction(async (tx) => {
        // 1. Inserir a avaliação
        await tx.insert(reviews).values({
          reviewerId,
          revieweeId,
          itemId,
          rating: rating.toString(), 
          comment,
        });

        // 2. Buscar dados atuais
        const reviewee = await tx.query.users.findFirst({
          where: eq(users.id, revieweeId),
          columns: { ratingAverage: true, ratingCount: true },
        });

        if (!reviewee) {
          throw new Error('Usuário avaliado não encontrado.');
        }

        // 3. Matemática da Média
        const oldCount = Number(reviewee.ratingCount);
        const oldAverage = Number(reviewee.ratingAverage);
        
        const newCount = oldCount + 1;
        const newAverage = ((oldAverage * oldCount) + rating) / newCount;

        // 4. Atualizar Perfil
        await tx.update(users)
          .set({
            ratingAverage: newAverage.toFixed(2),
            ratingCount: newCount.toString(),
          })
          .where(eq(users.id, revieweeId));
      });

      return reply.status(201).send({ message: 'Avaliação registrada com sucesso!' });

    } catch (error: any) {
      console.error('[REVIEWS] Erro ao registrar avaliação:', error);
      if (error.message === 'Usuário avaliado não encontrado.') {
        return reply.status(404).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Erro interno ao processar a avaliação.' });
    }
  });
};