import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, isNull, count } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { users, items, freightRequests } from '../../database/schema';

export const publicStatisticsRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/public/statistics', {
    // Temos uma rota aberta aqui.
    schema: {
      tags: ['Public'],
      summary: 'Estatísticas Públicas (Landing Page)',
      description: 'Retorna os números de impacto do Desapega Social para exibição pública na tela inicial (Prova Social).',
      response: {
        200: z.object({
          totalUsers: z.number(),
          totalDonations: z.number(),
          totalFreightsCompleted: z.number()
        }),
        500: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      // Disparamos as 3 buscas  ao mesmo tempo
      const [usersCount, donationsCount, freightsCount] = await Promise.all([
        // 1. Usuários ativos (que não foram banidos)
        db.select({ value: count() }).from(users).where(isNull(users.deletedAt)),
        
        // 2. Apenas Itens que realmente chegaram nas mãos de alguém
        db.select({ value: count() }).from(items).where(eq(items.status, 'Doado')),
        
        // 3. Apenas Fretes que foram concluídos com sucesso
        db.select({ value: count() }).from(freightRequests).where(eq(freightRequests.status, 'Finalizado'))
      ]);

      return reply.status(200).send({
        totalUsers: Number(usersCount[0].value),
        totalDonations: Number(donationsCount[0].value),
        totalFreightsCompleted: Number(freightsCount[0].value)
      });

    } catch (error) {
      console.error('[PUBLIC] Erro ao buscar estatísticas públicas:', error);
      return reply.status(500).send({ error: 'Erro interno ao carregar as estatísticas.' });
    }
  });
};