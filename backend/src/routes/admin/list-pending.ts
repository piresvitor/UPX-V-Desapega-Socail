import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { verificationRequests, users } from '../../database/schema';
import { authenticateToken, requireAdmin } from '../../middleware/auth';

export const listPendingVerificationsRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/admin/verifications/pending', {
    onRequest: [authenticateToken, requireAdmin], 
    schema: {
      tags: ['Admin'],
      summary: 'Listar Pedidos Pendentes (Fila)',
      description: 'Retorna a fila de usuários aguardando análise manual de documentos. Ordenado do pedido mais antigo para o mais novo.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header must be Bearer token')
      }),
      response: {
        200: z.array(z.object({
          id: z.uuid(),
          userId: z.uuid(),
          userName: z.string(),
          userEmail: z.string().email(),
          identityDocumentUrl: z.string(),
          incomeProofUrl: z.string(),
          createdAt: z.date()
        })),
        500: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      // Cruzamos a tabela de pedidos com a tabela de usuários (JOIN)
      // para devolver os dados da pessoa e as fotos do Firebase tudo junto!
      const pendingRequests = await db
        .select({
          id: verificationRequests.id,
          userId: verificationRequests.userId,
          userName: users.fullName,
          userEmail: users.email,
          identityDocumentUrl: verificationRequests.identityDocumentUrl,
          incomeProofUrl: verificationRequests.incomeProofUrl,
          createdAt: verificationRequests.createdAt
        })
        .from(verificationRequests)
        .innerJoin(users, eq(verificationRequests.userId, users.id))
        .where(eq(verificationRequests.status, 'Analise_Manual'))
        .orderBy(asc(verificationRequests.createdAt)); // asc = do mais antigo pro mais novo

      return reply.status(200).send(pendingRequests);

    } catch (error) {
      console.error('🛡️ [ADMIN] Erro ao buscar fila de verificações:', error);
      return reply.status(500).send({ error: 'Erro interno ao carregar a fila de trabalho.' });
    }
  });
};