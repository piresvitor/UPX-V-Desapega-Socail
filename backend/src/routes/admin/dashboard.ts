import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, isNull, count, sql } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { users, items, freightRequests, verificationRequests, chatRooms, reviews } from '../../database/schema';
import { authenticateToken, requireAdmin } from '../../middleware/auth';

export const adminDashboardRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/admin/dashboard', {
    onRequest: [authenticateToken, requireAdmin],
    schema: {
      tags: ['Admin'],
      summary: 'Dashboard de ADMIN com Métricas (Estatísticas)',
      description: 'Retorna um raio-x completo e otimizado da plataforma: total de usuários, doações, fretes e verificações pendentes.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header must be Bearer token')
      }),
      response: {
        200: z.object({
          users: z.object({
            totalActive: z.number(),
            verified: z.number(),
            byRole: z.record(z.string(), z.number()) // Ex: { "Doador": 10, "Beneficiário": 50 }
          }),
          items: z.object({
            total: z.number(),
            donated: z.number(), // Quantos já foram entregues/doados
            available: z.number()
          }),
          freights: z.object({
            total: z.number(),
            finished: z.number()
          }),
          verifications: z.object({
            pendingManualAnalysis: z.number()
          }),
          engagement: z.object({
            totalChatRooms: z.number(),
            totalReviews: z.number()
          })
        }),
        500: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      // Execução Paralela: 
      // Dispara todas as queries SQL COUNT simultaneamente!
      const [
        totalUsersResult,
        verifiedUsersResult,
        usersByRoleResult,
        itemsResult,
        freightsResult,
        pendingVerificationsResult,
        chatsResult,
        reviewsResult
      ] = await Promise.all([
        // 1. Total de Usuários Ativos (não banidos)
        db.select({ value: count() }).from(users).where(isNull(users.deletedAt)),
        
        // 2. Usuários com Selo de Verificado
        db.select({ value: count() }).from(users).where(eq(users.isVerified, true)),
        
        // 3. Usuários agrupados por Papel (Doador, Beneficiário, etc)
        db.select({ 
          role: users.role, 
          count: count() 
        }).from(users).where(isNull(users.deletedAt)).groupBy(users.role),

        // 4. Status dos Itens (Agrupados para pegar o Total, Disponível e Doado de uma vez)
        db.select({ 
          status: items.status, 
          count: count() 
        }).from(items).groupBy(items.status), 

        // 5. Status dos Fretes
        db.select({ 
          status: freightRequests.status, 
          count: count() 
        }).from(freightRequests).groupBy(freightRequests.status), 

        // 6. Fila de Verificação (Trabalho do Admin)
        db.select({ value: count() }).from(verificationRequests).where(eq(verificationRequests.status, 'Analise_Manual')),

        // 7. Engajamento (Chats)
        db.select({ value: count() }).from(chatRooms),

        // 8. Engajamento (Avaliações)
        db.select({ value: count() }).from(reviews)
      ]);

      // --- PROCESSAMENTO DOS RESULTADOS ---
      
      // Converte o array de { role: 'Doador', count: 5 } em um objeto { "Doador": 5 }
      const usersByRole = usersByRoleResult.reduce((acc, curr) => {
        acc[curr.role as string] = Number(curr.count);
        return acc;
      }, {} as Record<string, number>);

      // Conta Itens
      let totalItems = 0; let donatedItems = 0; let availableItems = 0;
      itemsResult.forEach(i => {
        const c = Number(i.count);
        totalItems += c;
        if (i.status === 'Doado') donatedItems = c;
        if (i.status === 'Disponível') availableItems = c;
      });

      // Conta Fretes
      let totalFreights = 0; let finishedFreights = 0;
      freightsResult.forEach(f => {
        const c = Number(f.count);
        totalFreights += c;
        if (f.status === 'Finalizado') finishedFreights = c;
      });

      // Monta a resposta final mapeada para o Zod
      const dashboardData = {
        users: {
          totalActive: Number(totalUsersResult[0].value),
          verified: Number(verifiedUsersResult[0].value),
          byRole: usersByRole
        },
        items: {
          total: totalItems,
          donated: donatedItems,
          available: availableItems
        },
        freights: {
          total: totalFreights,
          finished: finishedFreights
        },
        verifications: {
          pendingManualAnalysis: Number(pendingVerificationsResult[0].value)
        },
        engagement: {
          totalChatRooms: Number(chatsResult[0].value),
          totalReviews: Number(reviewsResult[0].value)
        }
      };

      return reply.status(200).send(dashboardData);

    } catch (error) {
      console.error('[ADMIN] Erro ao gerar dashboard:', error);
      return reply.status(500).send({ error: 'Erro interno ao compilar os dados do dashboard.' });
    }
  });
};