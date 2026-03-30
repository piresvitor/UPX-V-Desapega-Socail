import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { verificationRequests } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

export const getMyVerificationRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/verifications/me', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Verifications (LGPD & OCR)'],
      summary: 'Consultar Status da Verificação',
      description: 'Retorna o status atual do pedido de verificação de identidade do usuário autenticado.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header must be Bearer token')
      }),
      response: {
        200: z.object({
          id: z.uuid(),
          status: z.string(), // Ex: 'Processando_IA', 'Analise_Manual', 'Aprovado_Auto'
          adminMessage: z.string().nullable(),
          updatedAt: z.date()
        }),
        404: z.object({
          status: z.literal('Nao_Solicitado'),
          message: z.string()
        }),
        500: z.object({
          error: z.string()
        })
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.sub;

      // Busca o pedido de verificação MAIS RECENTE desse usuário
      const latestRequest = await db.query.verificationRequests.findFirst({
        where: eq(verificationRequests.userId, userId),
        orderBy: [desc(verificationRequests.createdAt)], // Pega o último
      });

      if (!latestRequest) {
        return reply.status(404).send({ 
          status: 'Nao_Solicitado',
          message: 'Nenhuma solicitação de verificação encontrada.' 
        });
      }

      // Retorna o status e a mensagem para o frontend montar a tela
      return reply.status(200).send({
        id: latestRequest.id,
        status: latestRequest.status,
        adminMessage: latestRequest.adminMessage,
        updatedAt: latestRequest.updatedAt
      });

    } catch (error) {
      console.error('Erro ao buscar status de verificação:', error);
      return reply.status(500).send({ error: 'Erro interno ao buscar o status.' });
    }
  });
};