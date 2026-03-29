import { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { verificationRequests } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

export async function getMyVerificationRoute(app: FastifyInstance) {
  app.get('/verifications/me', { preHandler: [authenticateToken] }, async (request, reply) => {
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
      status: latestRequest.status, // 'Processando_IA', 'Analise_Manual', 'Aprovado_Auto', etc.
      adminMessage: latestRequest.adminMessage,
      updatedAt: latestRequest.updatedAt
    });
  });
}